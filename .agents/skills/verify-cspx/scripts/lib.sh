#!/usr/bin/env bash
# Shared paths for the CSPX Tracker verification scripts.
# Source this file; do not execute it.

_lib_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT="$_lib_dir"
while [ "$ROOT" != "/" ] && [ ! -f "$ROOT/package.json" ]; do
  ROOT=$(dirname "$ROOT")
done
if [ ! -f "$ROOT/package.json" ]; then
  echo "verify-cspx: could not find the repo root from $_lib_dir" >&2
  return 1 2>/dev/null || exit 1
fi

EVIDENCE="${VERIFY_CSPX_EVIDENCE:-/tmp/verify-cspx-evidence}"
ORIGIN="${VERIFY_CSPX_ORIGIN:-http://localhost:3000}"
PLAYWRIGHT_PREFIX="${VERIFY_CSPX_PLAYWRIGHT:-/tmp/verify-cspx-playwright}"

# Loopback ports a local `npx convex dev` binds on Convex 1.50.
CONVEX_URL_DEFAULT="http://127.0.0.1:3210"
CONVEX_SITE_URL_DEFAULT="http://127.0.0.1:3211"
