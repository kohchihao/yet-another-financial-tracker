#!/usr/bin/env bash
# Run every check: Playwright for /dashboard and /sign-in, curl for /auth/refresh and /api/mcp.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
cd "$ROOT"
mkdir -p "$EVIDENCE"

if [ ! -d "$PLAYWRIGHT_PREFIX/node_modules/playwright" ]; then
  echo "drive: installing playwright into $PLAYWRIGHT_PREFIX (not the repo)"
  npm install --prefix "$PLAYWRIGHT_PREFIX" playwright
fi

fail=0
echo "drive: Playwright checks (signed-out dashboard, GitHub OAuth handoff)"
NODE_PATH="$PLAYWRIGHT_PREFIX/node_modules" node "$ROOT/.agents/skills/verify-cspx/scripts/drive-ui.cjs" || fail=1

echo "drive: curl checks (POST /auth/refresh)"
bash "$ROOT/.agents/skills/verify-cspx/scripts/refresh.sh" || fail=1

echo "drive: curl checks (/api/mcp)"
bash "$ROOT/.agents/skills/verify-cspx/scripts/mcp.sh" || fail=1

if [ -d /opt/cursor/artifacts ]; then
  cp -f "$EVIDENCE/dashboard-redirect-sign-in.png" /opt/cursor/artifacts/verify-cspx-dashboard-redirect-sign-in.png
  cp -f "$EVIDENCE/github-authorize.png" /opt/cursor/artifacts/verify-cspx-github-authorize.png
  echo "drive: copied screenshots to /opt/cursor/artifacts"
fi

if [ "$fail" -eq 0 ]; then
  echo "PASS drive"
else
  echo "FAIL drive" >&2
fi
exit "$fail"
