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

export CONVEX_AGENT_MODE=anonymous
unset CONVEX_DEPLOY_KEY

echo "launch: CONVEX_DEPLOY_KEY is unset, CONVEX_AGENT_MODE=anonymous"
echo "launch: starting \`npx convex dev\` (log: $EVIDENCE/convex-dev.log)"

# `script` allocates a TTY so the CLI flushes "Convex functions ready!" immediately.
# CONVEX_AGENT_MODE=anonymous skips the "login or run locally" prompt that a TTY
# would otherwise show, and a non-interactive shell without it crashes on that prompt.
setsid script -q -f -e -c "npx convex dev" "$EVIDENCE/convex-dev.log" &
echo $! >"$EVIDENCE/convex.pid"
echo "launch: convex pid $(cat "$EVIDENCE/convex.pid")"

ready=0
for _ in $(seq 1 180); do
  if grep -q "Convex functions ready!" "$EVIDENCE/convex-dev.log" 2>/dev/null; then
    ready=1
    break
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

instance=$(curl -fsS --max-time 5 "$CONVEX_URL_DEFAULT/instance_name")
if [ "$instance" != "$CONVEX_INSTANCE_NAME" ]; then
  echo "FAIL launch: $CONVEX_URL_DEFAULT/instance_name returned '$instance', expected $CONVEX_INSTANCE_NAME" >&2
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
