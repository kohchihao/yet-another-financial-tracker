#!/usr/bin/env bash
# curl checks for POST /api/mcp: 401 with no key, 401 with a bad key, 200 with a
# key minted on the local anonymous deployment.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
cd "$ROOT"
mkdir -p "$EVIDENCE"

INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"verify-cspx","version":"0.0.1"}}}'
EMAIL="verify-cspx@localhost"
fail=0

mcp_post() {
  local body_file=$1
  local header_file=$2
  shift 2
  curl -sS --max-time 20 -D "$header_file" -o "$body_file" \
    -X POST "$ORIGIN/api/mcp" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    "$@" \
    --data "$INIT"
}

assert_401() {
  local name=$1
  local header_file=$2
  local body_file=$3
  python3 - "$name" "$header_file" "$body_file" <<'PY'
import json, sys
name, header_path, body_path = sys.argv[1:]
headers = open(header_path, encoding="utf-8").read()
status = [line for line in headers.splitlines() if line.startswith("HTTP/")]
if not status or " 401 " not in status[0]:
    print(f"FAIL {name}: expected 401, got {status[:1]}", file=sys.stderr)
    sys.exit(1)
body = json.load(open(body_path, encoding="utf-8"))
expected = {"error": "invalid_token", "error_description": "No authorization provided"}
if body != expected:
    print(f"FAIL {name}: body {body}", file=sys.stderr)
    sys.exit(1)
print(f"PASS {name}")
print(json.dumps(body))
PY
}

mcp_post "$EVIDENCE/mcp-no-key.body" "$EVIDENCE/mcp-no-key.headers" || fail=1
if ! assert_401 mcp-no-key "$EVIDENCE/mcp-no-key.headers" "$EVIDENCE/mcp-no-key.body"; then
  fail=1
fi

mcp_post "$EVIDENCE/mcp-bad-key.body" "$EVIDENCE/mcp-bad-key.headers" \
  -H "Authorization: Bearer yaft_not-a-real-key" || fail=1
if ! assert_401 mcp-bad-key "$EVIDENCE/mcp-bad-key.headers" "$EVIDENCE/mcp-bad-key.body"; then
  fail=1
fi

# Mint a key without a session and without deployment secrets.
# 1. Ensure a users row exists (import writes the document; no auth function inserts users).
# 2. Call the public createApiKey action with a CLI identity whose subject is
#    "<users id>|verify-cspx". getAuthUserId (convex-auth v1) reads the id before the first "|".
#    storeApiKey is internal and calls getAuthUserId again; the action forwards
#    that CLI identity into runMutation, so the insert succeeds.
users_json=$(npx convex data users --format json)
user_id=$(USERS_JSON="$users_json" EMAIL="$EMAIL" python3 - <<'PY'
import json, os
text = os.environ["USERS_JSON"].strip()
# Convex 1.50 prints this sentence for an empty table instead of [].
if not text or text.startswith("There are no documents"):
    rows = []
else:
    rows = json.loads(text)
email = os.environ["EMAIL"]
match = [row["_id"] for row in rows if row.get("email") == email]
print(match[0] if match else "")
PY
)

if [ -z "$user_id" ]; then
  printf '%s\n' "{\"name\":\"Verify CSPX\",\"email\":\"$EMAIL\"}" >"$EVIDENCE/users.jsonl"
  npx convex import --table users --format jsonLines --append --yes "$EVIDENCE/users.jsonl"
  users_json=$(npx convex data users --format json)
  user_id=$(USERS_JSON="$users_json" EMAIL="$EMAIL" python3 - <<'PY'
import json, os
text = os.environ["USERS_JSON"].strip()
# Convex 1.50 prints this sentence for an empty table instead of [].
if not text or text.startswith("There are no documents"):
    rows = []
else:
    rows = json.loads(text)
email = os.environ["EMAIL"]
match = [row["_id"] for row in rows if row.get("email") == email]
print(match[0] if match else "")
PY
)
fi

if [ -z "$user_id" ]; then
  echo "FAIL mcp-valid-key: could not seed a users row for $EMAIL" >&2
  exit 1
fi

identity=$(USER_ID="$user_id" python3 - <<'PY'
import json, os
print(json.dumps({"subject": os.environ["USER_ID"] + "|verify-cspx"}))
PY
)
key_json=$(npx convex run apiKeys:createApiKey '{"name":"verify-cspx"}' --identity "$identity")
umask 077
printf '%s\n' "$key_json" >"$EVIDENCE/api-key.json"
chmod 600 "$EVIDENCE/api-key.json"
# Record the user id and key prefix only. The raw key stays in api-key.json.
python3 - "$user_id" "$EVIDENCE/api-key.json" "$EVIDENCE/mcp-key-meta.txt" <<'PY'
import json, sys
user_id, key_path, meta_path = sys.argv[1:]
text = open(key_path, encoding="utf-8").read()
start, end = text.find("{"), text.rfind("}")
payload = json.loads(text[start:end + 1])
key = payload["key"]
if not key.startswith("yaft_"):
    raise SystemExit("created key does not start with yaft_")
open(meta_path, "w", encoding="utf-8").write(
    f"userId={user_id}\nprefix={payload['prefix']}\nkey_length={len(key)}\n"
)
print(f"mcp: minted local key prefix={payload['prefix']} userId={user_id}")
PY

raw_key=$(python3 - "$EVIDENCE/api-key.json" <<'PY'
import json, sys
text = open(sys.argv[1], encoding="utf-8").read()
start, end = text.find("{"), text.rfind("}")
print(json.loads(text[start:end + 1])["key"])
PY
)

mcp_post "$EVIDENCE/mcp-ok.body" "$EVIDENCE/mcp-ok.headers" \
  -H "Authorization: Bearer $raw_key" || fail=1
unset raw_key

if ! python3 - "$EVIDENCE/mcp-ok.headers" "$EVIDENCE/mcp-ok.body" <<'PY'
import json, sys
header_path, body_path = sys.argv[1:]
headers = open(header_path, encoding="utf-8").read().lower()
status = [line for line in open(header_path, encoding="utf-8") if line.startswith("HTTP/")]
if not status or " 200 " not in status[0]:
    print(f"FAIL mcp-valid-key: expected 200, got {status[:1]}", file=sys.stderr)
    sys.exit(1)
if "content-type: text/event-stream" not in headers:
    print("FAIL mcp-valid-key: expected text/event-stream", file=sys.stderr)
    sys.exit(1)
text = open(body_path, encoding="utf-8").read()
data = text.split("data: ", 1)[1].strip()
message = json.loads(data)
result = message["result"]
if result["serverInfo"]["name"] != "cspx-tracker":
    print(f"FAIL mcp-valid-key: serverInfo {result['serverInfo']}", file=sys.stderr)
    sys.exit(1)
if result["protocolVersion"] != "2024-11-05":
    print(f"FAIL mcp-valid-key: protocol {result['protocolVersion']}", file=sys.stderr)
    sys.exit(1)
if message.get("id") != 1:
    print(f"FAIL mcp-valid-key: id {message.get('id')}", file=sys.stderr)
    sys.exit(1)
print("PASS mcp-valid-key")
print(text)
PY
then
  fail=1
fi

exit "$fail"
