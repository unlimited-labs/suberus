#!/usr/bin/env bash
# Build the docx-api test image (pinned Pandoc + LibreOffice + test deps) and run
# pytest inside it with this directory mounted, so the full normalize/diff
# pipeline is exercised and golden updates write back to the host.
#
#   ./run-tests.sh                  # run the suite against committed goldens
#   ./run-tests.sh -e UPDATE_BASELINE=1   # (re)generate goldens, then they're compared
#   ./run-tests.sh gen              # regenerate the .docx fixtures
#
# Any extra args are passed through to `docker run` (before the image), so e.g.
#   ./run-tests.sh -k tables
# works via the default pytest CMD.
set -euo pipefail
cd "$(dirname "$0")"

IMAGE=suberus-docx-api-test
docker build --target test -t "$IMAGE" .

if [ "${1:-}" = "gen" ]; then
  exec docker run --rm -v "$PWD:/app" -w /app "$IMAGE" \
    python test_fixtures/generate_fixtures.py
fi

exec docker run --rm -v "$PWD:/app" -w /app "$IMAGE" pytest -q "$@"
