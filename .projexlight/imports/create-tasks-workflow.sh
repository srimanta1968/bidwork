#!/usr/bin/env bash
set -e
INPUT="$(dirname "$0")/new-tasks-workflow.json"
PROJECT_PATH="/c/Users/srima/projex_verticals/BidWork"
count=$(jq '.tasks | length' "$INPUT")
for ((idx=1; idx<=count; idx++)); do
  i=$((idx-1))
  title=$(jq -r ".tasks[$i].title" "$INPUT")
  jq --arg p "$PROJECT_PATH" ".tasks[$i] + {projectPath:\$p}" "$INPUT" > /tmp/wf_payload.json
  resp=$(curl -s -X POST http://localhost:8766/api/tasks/create \
    -H 'Content-Type: application/json' \
    --data-binary @/tmp/wf_payload.json)
  ok=$(echo "$resp" | jq -r '.success')
  short_id=$(echo "$resp" | jq -r '.data.short_id // "?"')
  short=$(echo "$title" | cut -c1-72)
  echo "[$idx] $ok  $short_id  $short"
  if [ "$ok" != "true" ]; then
    echo "    RESP: $resp"
    exit 1
  fi
done
