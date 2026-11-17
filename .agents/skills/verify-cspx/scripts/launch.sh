#!/usr/bin/env bash
# Start the local anonymous Convex backend and Next.js, and record their PIDs.
# Does not set CONVEX_DEPLOY_KEY and refuses to start if one is already set.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
cd "$ROOT"
mkdir -p "$EVIDENCE"

if [ -n "${CONVEX_DEPLOY_KEY:-}" ]; then
  echo "FAIL launch: CONVEX_DEPLOY_KEY is set. Unset it. This skill only drives a local anonymous backend." >&2
  exit 1
fi

if [ -f "$ROOT/.env.local" ]; then
  deployment=$(grep -E '^CONVEX_DEPLOYMENT=' "$ROOT/.env.local" | head -n 1 | cut -d= -f2- || true)
  case "$deployment" in
    "" | anonymous:*) ;;
    *)
      echo "FAIL launch: .env.local CONVEX_DEPLOYMENT=$deployment is not an anonymous local deployment. Refusing to touch it." >&2
      exit 1
      ;;
  esac
fi

if [ -f "$EVIDENCE/convex.pid" ] && kill -0 "$(cat "$EVIDENCE/convex.pid")" 2>/dev/null; then
  echo "FAIL launch: convex pid $(cat "$EVIDENCE/convex.pid") is already running. Run cleanup.sh first." >&2
  exit 1
fi
if [ -f "$EVIDENCE/next.pid" ] && kill -0 "$(cat "$EVIDENCE/next.pid")" 2>/dev/null; then
  echo "FAIL launch: next pid $(cat "$EVIDENCE/next.pid") is already running. Run cleanup.sh first." >&2
  exit 1
fi

unset CONVEX_DEPLOY_KEY
unset CONVEX_AGENT_MODE

echo "launch: CONVEX_DEPLOY_KEY is unset, CONVEX_AGENT_MODE is unset"
echo "launch: starting \`npx convex dev\` with stdin closed (log: $EVIDENCE/convex-dev.log)"

# Stdin is not a terminal. On Convex 1.50 that is the path that starts a local
# anonymous deployment without a login prompt.
setsid stdbuf -oL -eL npx convex dev >"$EVIDENCE/convex-dev.log" 2>&1 </dev/null &
echo $! >"$EVIDENCE/convex.pid"
echo "launch: convex pid $(cat "$EVIDENCE/convex.pid")"

# v2 convex.config.ts requires these three before functions will push. They are
# not GitHub credentials. Placeholders exist only so the local anonymous
# deployment can load. Never pass --prod, and never read the values back.
placeholders_set=0
ready=0
for _ in $(seq 1 180); do
  if grep -q "Convex functions ready!" "$EVIDENCE/convex-dev.log" 2>/dev/null; then
    ready=1
    break
  fi
  if [ "$placeholders_set" -eq 0 ] && grep -q "declared as required in convex.config.ts but their values were not set" "$EVIDENCE/convex-dev.log" 2>/dev/null; then
    echo "launch: local deployment is missing the required auth env vars; setting non-secret placeholders"
    placeholder_file=$(mktemp)
    chmod 600 "$placeholder_file"
    cat >"$placeholder_file" <<'EOF'
AUTH_GITHUB_CLIENT_ID=verify-cspx-local
AUTH_GITHUB_CLIENT_SECRET=verify-cspx-local-not-a-secret
ALLOWED_GITHUB_LOGIN=verify-cspx@localhost
EOF
    npx convex env set --from-file "$placeholder_file"
    rm -f "$placeholder_file"
    placeholders_set=1
  fi
  if ! kill -0 "$(cat "$EVIDENCE/convex.pid")" 2>/dev/null; then
    echo "FAIL launch: npx convex dev exited before it was ready. Log follows." >&2
    cat "$EVIDENCE/convex-dev.log" >&2 || true
    exit 1
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "FAIL launch: timed out waiting for 'Convex functions ready!'." >&2
  cat "$EVIDENCE/convex-dev.log" >&2 || true
  exit 1
fi

deployment=$(grep -E '^CONVEX_DEPLOYMENT=' "$ROOT/.env.local" | head -n 1 | cut -d= -f2-)
case "$deployment" in
  anonymous:?*) ;;
  *)
    echo "FAIL launch: CONVEX_DEPLOYMENT=$deployment (expected anonymous:<name>)" >&2
    exit 1
    ;;
esac
expected_instance=${deployment#anonymous:}
instance=$(curl -fsS --max-time 5 "$CONVEX_URL_DEFAULT/instance_name")
if [ "$instance" != "$expected_instance" ]; then
  echo "FAIL launch: $CONVEX_URL_DEFAULT/instance_name returned '$instance', expected $expected_instance" >&2
  exit 1
fi

echo "launch: Convex functions ready, instance_name=$instance"
echo "launch: starting \`npx next dev --port 3000\` (log: $EVIDENCE/next-dev.log)"

setsid script -q -f -e -c "npx next dev --port 3000" "$EVIDENCE/next-dev.log" &
echo $! >"$EVIDENCE/next.pid"
echo "launch: next pid $(cat "$EVIDENCE/next.pid")"

ready=0
for _ in $(seq 1 90); do
  if grep -q "Local:.*http://localhost:3000" "$EVIDENCE/next-dev.log" 2>/dev/null \
    && grep -q "Ready" "$EVIDENCE/next-dev.log" 2>/dev/null; then
    ready=1
    break
  fi
  if ! kill -0 "$(cat "$EVIDENCE/next.pid")" 2>/dev/null; then
    echo "FAIL launch: next dev exited before it was ready. Log follows." >&2
    cat "$EVIDENCE/next-dev.log" >&2 || true
    exit 1
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "FAIL launch: timed out waiting for Next.js Ready on http://localhost:3000." >&2
  cat "$EVIDENCE/next-dev.log" >&2 || true
  exit 1
fi

echo "launch: Next.js ready at http://localhost:3000"
echo "PASS launch"
