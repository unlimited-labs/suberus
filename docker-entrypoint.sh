#!/bin/sh
set -e

echo "Starting server..."
exec node .output/server/index.mjs
