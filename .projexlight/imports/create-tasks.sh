#!/usr/bin/env bash
# Reads tasks from new-tasks.json and POSTs each via the single-create endpoint,
# starting from a configurable --from index (1-based). The first task was already
# created as TK-2673, so default to starting at index 5 (we left off after task 4).
set -e
INPUT="$(dirname "$0")/new-tasks.json"
PROJECT_PATH="/c/Users/srima/projex_verticals/BidWork"
FROM="${1:-1}"

count=$(jq '.tasks | length' "$INPUT")
for ((idx=FROM; idx<=count; idx++)); do
  i=$((idx-1))
  title=$(jq -r ".tasks[$i].title" "$INPUT")
  jq --arg p "$PROJECT_PATH" ".tasks[$i] + {projectPath:\$p}" "$INPUT" > /tmp/task_payload.json
  resp=$(curl -s -X POST http://localhost:8766/api/tasks/create \
    -H 'Content-Type: application/json' \
    --data-binary @/tmp/task_payload.json)
  ok=$(echo "$resp" | jq -r '.success')
  short_id=$(echo "$resp" | jq -r '.data.short_id // "?"')
  short=$(echo "$title" | cut -c1-70)
  echo "[$idx] $ok  $short_id  $short"
  if [ "$ok" != "true" ]; then
    echo "    RESP: $resp"
    exit 1
  fi
done
