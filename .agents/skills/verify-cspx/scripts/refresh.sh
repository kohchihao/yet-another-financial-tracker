#!/usr/bin/env bash
# POST /auth/refresh with no session cookie.
# A same-origin Origin is required: the handler refuses a POST with no Origin
# as cross-site (403) before it looks at the session.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
cd "$ROOT"
mkdir -p "$EVIDENCE"

curl -sS --max-time 20 -D "$EVIDENCE/auth-refresh.headers" -o "$EVIDENCE/auth-refresh.body" \
  -X POST "$ORIGIN/auth/refresh" \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: application/json" \
  --data '{}'

python3 - "$EVIDENCE/auth-refresh.headers" "$EVIDENCE/auth-refresh.body" <<'PY'
import json, sys
header_path, body_path = sys.argv[1:]
headers = open(header_path, encoding="utf-8").read()
status = [line for line in headers.splitlines() if line.startswith("HTTP/")]
body_text = open(body_path, encoding="utf-8").read()
try:
    body = json.loads(body_text)
except json.JSONDecodeError:
    body = body_text
if not status or " 401 " not in status[0] or body != {"tokens": None}:
    print(f"FAIL auth-refresh: status={status[:1]} body={body_text}", file=sys.stderr)
    sys.exit(1)
print("PASS auth-refresh")
print(body_text)
PY
