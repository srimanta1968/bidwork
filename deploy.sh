#!/usr/bin/env bash
# BidWork deploy script (runs ON the prod EC2 host).
#
# Scoped to /opt/bidwork only. Never kills other apps:
#   - systemctl restart targets ONLY bidwork.service (and only if server code changed)
#   - nginx is RELOADED (graceful) — never restarted; only when static assets changed
#   - never touches other docker containers or systemd units
#   - never uses killall / pkill
#
# Migrations: the server's app.ts calls runMigrations() on boot, so a systemd
# restart applies any new admin/* tables automatically. No separate migrate step.
#
# Exits non-zero on any failure; uses set -euo pipefail.

set -euo pipefail

REPO=/opt/bidwork
CLIENT=$REPO/client
ADMIN=$REPO/admin-client
SERVER=$REPO/server
BRANCH=${BRANCH:-main}
LOCKFILE=/tmp/bidwork-deploy.lock

# Single-instance guard: bail if another deploy is mid-flight.
exec 9>"$LOCKFILE"
flock -n 9 || { echo "[deploy] another deploy is already running ($LOCKFILE)"; exit 1; }

cd "$REPO"

echo "[deploy] fetching $BRANCH"
git fetch --quiet origin "$BRANCH"

# Detect what changed between HEAD and origin so we can rebuild only what is needed.
BEFORE=$(git rev-parse HEAD)
AFTER=$(git rev-parse "origin/$BRANCH")
if [ "$BEFORE" = "$AFTER" ]; then
  echo "[deploy] already up-to-date ($BEFORE)"; exit 0
fi
CHANGED=$(git diff --name-only "$BEFORE" "$AFTER")
echo "[deploy] $BEFORE -> $AFTER"
echo "[deploy] changed files:"; echo "$CHANGED" | sed "s/^/    /"

# Preserve build-only / env files that are not in git.
git stash push -u -m "deploy-stash-$(date +%s)" >/dev/null 2>&1 || true
git pull --rebase --quiet origin "$BRANCH"
git stash pop >/dev/null 2>&1 || true

SERVER_CHANGED=$(echo "$CHANGED" | grep -c "^server/" || true)
CLIENT_CHANGED=$(echo "$CHANGED" | grep -c "^client/" || true)
ADMIN_CHANGED=$(echo "$CHANGED" | grep -c "^admin-client/" || true)
SERVER_PKG_CHANGED=$(echo "$CHANGED" | grep -c "^server/package" || true)
CLIENT_PKG_CHANGED=$(echo "$CHANGED" | grep -c "^client/package" || true)
ADMIN_PKG_CHANGED=$(echo "$CHANGED" | grep -c "^admin-client/package" || true)

# Server rebuild (only when needed). systemd restart triggers runMigrations()
# so DB schema changes (e.g. admin.provider_config, admin.email_log) apply here.
if [ "$SERVER_CHANGED" -gt 0 ]; then
  if [ "$SERVER_PKG_CHANGED" -gt 0 ]; then
    echo "[deploy] server package changed -> npm install"
    (cd "$SERVER" && npm install --no-audit --no-fund --silent)
  fi
  echo "[deploy] restarting ONLY bidwork.service"
  sudo systemctl restart bidwork
  # Wait briefly and confirm it came up; do not affect other services.
  sleep 3
  if ! systemctl is-active --quiet bidwork; then
    echo "[deploy] ERROR: bidwork.service failed to start. Last logs:"
    sudo journalctl -u bidwork -n 30 --no-pager
    exit 1
  fi
else
  echo "[deploy] server unchanged, leaving bidwork.service running"
fi

# Helper: build one Vite app (client or admin-client). Reloads nginx only at
# the end if at least one of them produced fresh static assets.
NGINX_RELOAD_NEEDED=0

build_vite_app() {
  local label="$1" appdir="$2" pkg_changed="$3"
  if [ "$pkg_changed" -gt 0 ]; then
    echo "[deploy] $label package changed -> npm install"
    (cd "$appdir" && npm install --no-audit --no-fund --silent)
  fi
  echo "[deploy] production vite build ($label)"
  (cd "$appdir" && NODE_ENV=production npx vite build)
  # Sanity: dist must contain index.html
  test -s "$appdir/dist/index.html" || {
    echo "[deploy] ERROR: $label vite build did not produce index.html"; exit 1;
  }
  NGINX_RELOAD_NEEDED=1
}

if [ "$CLIENT_CHANGED" -gt 0 ]; then
  build_vite_app "client" "$CLIENT" "$CLIENT_PKG_CHANGED"
else
  echo "[deploy] client unchanged, skipping vite build"
fi

if [ "$ADMIN_CHANGED" -gt 0 ]; then
  build_vite_app "admin-client" "$ADMIN" "$ADMIN_PKG_CHANGED"
else
  echo "[deploy] admin-client unchanged, skipping vite build"
fi

if [ "$NGINX_RELOAD_NEEDED" -eq 1 ]; then
  echo "[deploy] reloading nginx (graceful, no dropped connections, no other vhosts affected)"
  sudo nginx -t
  sudo nginx -s reload
fi

echo "[deploy] done at $(date -u +%FT%TZ)"
