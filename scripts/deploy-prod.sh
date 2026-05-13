#!/usr/bin/env bash
# Local convenience wrapper: push current branch, SSH into the prod EC2 host,
# and invoke /opt/bidwork/deploy.sh there. Run from anywhere; the script
# discovers the BidWork repo root from its own location.
#
# Usage:
#   scripts/deploy-prod.sh                # deploy main
#   BRANCH=feat/x scripts/deploy-prod.sh  # deploy a non-main branch
#   DRY_RUN=1 scripts/deploy-prod.sh      # show what would happen, no SSH/push
#   SKIP_PUSH=1 scripts/deploy-prod.sh    # already pushed manually; just kick prod
#
# Push behavior:
#   - If origin/$BRANCH is already at local HEAD, no push is attempted.
#   - Otherwise `git push` runs. The repo's pre-push hook executes API tests
#     and will block a push on test failure; this script does NOT bypass the
#     hook (no --no-verify). Fix the tests, push manually, then re-run with
#     SKIP_PUSH=1 (or just re-run — the up-to-date check will skip the push).
#
# Required on the dev box:
#   - git remote 'origin' pointing at the BidWork GitHub repo
#   - SSH key at the path below (override via SSH_KEY env var)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BRANCH="${BRANCH:-main}"
PROD_HOST="${PROD_HOST:-ec2-user@ec2-54-160-123-18.compute-1.amazonaws.com}"
SSH_KEY="${SSH_KEY:-C:/Users/srima/ProjectX/Bidwork.pem}"
DRY_RUN="${DRY_RUN:-0}"
SKIP_PUSH="${SKIP_PUSH:-0}"

log() { echo "[deploy-prod] $*"; }
die() { echo "[deploy-prod] ERROR: $*" >&2; exit 1; }

# 1. Pre-flight on the dev box.
cd "$REPO_ROOT"

log "repo: $REPO_ROOT"
log "branch: $BRANCH"
log "prod host: $PROD_HOST"
log "ssh key: $SSH_KEY"

[ -f "$SSH_KEY" ] || die "SSH key not found at $SSH_KEY (override with SSH_KEY=...)"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
[ "$current_branch" = "$BRANCH" ] || die "current branch is '$current_branch', expected '$BRANCH'. Switch first or pass BRANCH=$current_branch."

if [ -n "$(git status --porcelain)" ]; then
  log "WARNING: working tree has uncommitted changes:"
  git status -s | sed 's/^/    /'
  log "These will NOT be deployed. Commit them or set DRY_RUN=1 to inspect."
fi

local_head="$(git rev-parse HEAD)"
log "local HEAD: $local_head"

if [ "$DRY_RUN" = "1" ]; then
  log "DRY_RUN=1 — exiting before push / ssh"
  exit 0
fi

# 2. Push so origin/$BRANCH catches up with local HEAD. The remote deploy.sh
# pulls origin/$BRANCH, so an un-pushed commit would be invisible to it.
#
# Skip the push if origin is already up-to-date — common when the user pushed
# manually (e.g. to get past a failed pre-push hook) and is just re-running
# this script to kick prod. Also skip when SKIP_PUSH=1 is set explicitly.
git fetch --quiet origin "$BRANCH" || die "git fetch origin $BRANCH failed"
remote_head="$(git rev-parse "origin/$BRANCH")"
log "origin/$BRANCH: $remote_head"

if [ "$SKIP_PUSH" = "1" ]; then
  log "SKIP_PUSH=1 — not pushing"
elif [ "$remote_head" = "$local_head" ]; then
  log "origin/$BRANCH already at local HEAD — no push needed"
else
  log "pushing $BRANCH to origin (pre-push hook will run; tests must pass)"
  if ! git push origin "$BRANCH"; then
    die "git push failed (pre-push hook likely blocked it). Fix the tests, push manually, then re-run scripts/deploy-prod.sh (it will skip the push automatically if origin is up-to-date)."
  fi
fi

# Confirm origin and local agree before kicking prod.
remote_head="$(git rev-parse "origin/$BRANCH")"
if [ "$remote_head" != "$local_head" ]; then
  die "after push step, origin/$BRANCH ($remote_head) still does not match local HEAD ($local_head). Aborting before SSH so we don't deploy stale code."
fi

# 3. SSH into prod and run the on-host deploy.sh.
log "running /opt/bidwork/deploy.sh on $PROD_HOST"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new \
    "$PROD_HOST" \
    "BRANCH=$BRANCH bash /opt/bidwork/deploy.sh"

log "done"
