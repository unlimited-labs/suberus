#!/usr/bin/env bash
# Fails if a service's OpenAPI snapshot breaks /v1 vs git ref $1.
# Intentional break: list it in services/<svc>/openapi-breaking-allow.txt (oasdiff --err-ignore).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
base=$1
tmp=$(mktemp -d)
for svc in docx-api pdf-api planner-api; do
  spec=services/$svc/openapi.json
  if ! git show "$base:$spec" > "$tmp/$svc.json" 2>/dev/null; then
    echo "$svc: no snapshot at $base, skipped"
    continue
  fi
  allow=services/$svc/openapi-breaking-allow.txt
  args=(breaking "/base/$svc.json" "/repo/$spec" --fail-on ERR --format githubactions)
  [ -f "$allow" ] && args+=(--err-ignore "/repo/$allow")
  echo "$svc:"
  docker run --rm -v "$PWD:/repo" -v "$tmp:/base" tufin/oasdiff:v1.35.0 "${args[@]}"
done
