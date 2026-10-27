#!/bin/sh
# Runs the full headless test suite. Requires Node.js (no browser needed).
# Usage: sh tests/run_all.sh   (from repo root)
set -e
cd "$(dirname "$0")/.."
echo "==> extracting inline JS from index.html"
node tests/extract.js
echo ""
echo "==> syntax check"
node --check tests/extracted.js && echo "syntax OK"
echo ""
for t in smoke frame_loop identity save_management rivals districts offline integration start_screen version; do
  echo "==> tests/$t.js"
  node tests/$t.js | tail -1
done
echo ""
echo "ALL TESTS PASSED"
