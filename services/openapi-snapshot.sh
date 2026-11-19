#!/usr/bin/env bash
# Regenerates services/<svc>/openapi.json, the /v1 contract snapshot CI diffs.
set -euo pipefail
cd "$(dirname "$0")"
for svc in docx-api pdf-api planner-api; do
  (cd "$svc" && uv run --frozen python -c "import json, main; open('openapi.json', 'w', encoding='utf-8', newline='\n').write(json.dumps(main.app.openapi(), indent=2, sort_keys=True) + '\n')")
done
