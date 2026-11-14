# /api/mcp rejects missing and bad keys, and accepts a local key

## Sub-features

- `POST http://localhost:3000/api/mcp` with no `Authorization` header returns 401.
- The same request with `Authorization: Bearer yaft_not-a-real-key` returns 401.
- The same request with a key minted on this local deployment returns 200 and an MCP `initialize` result whose `serverInfo.name` is `cspx-tracker`.

Both 401 bodies are exactly:

```json
{"error":"invalid_token","error_description":"No authorization provided"}
```

`app/api/mcp/route.ts` wraps the handler in `withMcpAuth(..., { required: true })`. `verifyToken` returns `undefined` when the header is missing, when `NEXT_PUBLIC_CONVEX_URL` is missing, or when `api.apiKeys.verifyApiKey` returns null. `verifyApiKey` catches unknown, malformed, and revoked keys and returns null instead of throwing, so the HTTP answer is the same 401 for "no key" and "bad key".

## How to get to it (user POV)

An MCP client posts JSON-RPC `initialize` to `/api/mcp`. Without a key created in the dashboard's AI access dialog, the call is refused. With a real `yaft_…` key, the tracker server answers.

On a local backend there is no signed-in dashboard user, so the check mints the key with the CLI instead of the dialog. The steps are below. They do not use a deploy key or any GitHub secret.

## Driving it with curl

`scripts/mcp.sh` (invoked by `scripts/drive.sh`) sends this body three times:

```bash
curl -sS --max-time 20 -D headers.txt -o body.txt \
  -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"verify-cspx","version":"0.0.1"}}}'
```

The bad-key request adds `-H "Authorization: Bearer yaft_not-a-real-key"`. The success request adds the minted key.

Pass requires:

- No key and bad key: status line contains `401`, and the body is the JSON object above.
- Valid key: status line contains `200`, `content-type` contains `text/event-stream`, and the `data:` event parses as JSON with `result.serverInfo.name` equal to `cspx-tracker`, `result.protocolVersion` equal to `2024-11-05`, and `id` equal to 1.

### Minting a valid key on the local backend

`createApiKey` and the internal `storeApiKey` both call `getAuthUserId`. There is no public function that inserts a user. The CLI can still do it, because `npx convex import` writes a `users` document and `npx convex run --identity` supplies the subject `getAuthUserId` splits on `|`.

1. Reuse a `users` row whose email is `verify-cspx@localhost`, or import one:

```bash
printf '%s\n' '{"name":"Verify CSPX","email":"verify-cspx@localhost"}' > users.jsonl
npx convex import --table users --format jsonLines --append --yes users.jsonl
npx convex data users --format json
```

2. Run the action as that user. `scripts/mcp.sh` reads `_id` from the JSON and passes it as the identity subject (`getAuthUserId` keeps the text before the first `|`):

```bash
npx convex run apiKeys:createApiKey '{"name":"verify-cspx"}' \
  --identity "{\"subject\":\"${user_id}|verify-cspx\"}"
```

The result is `{ "key": "yaft_…", "prefix": "yaft_…" }`. `storeApiKey` sees the same identity, so the hash is stored for that user id. `verifyApiKey` then finds the hash. This does not need a code change on the local anonymous deployment.

Do not pass `--prod`. Keep the raw key in `$VERIFY_CSPX_EVIDENCE/api-key.json` (mode 600). `mcp-key-meta.txt` stores the user id and the prefix only.

## Gotchas

- `--max-time 20` is required. A successful initialize is a server-sent event, and without a deadline curl can sit on the open stream.
- `Accept` must include `application/json` and `text/event-stream`. That is what `mcp-handler` expects for Streamable HTTP.
- A key that does not start with `yaft_` is also a 401 (the prefix check throws, `verifyApiKey` returns null). The bad-key check uses a `yaft_` prefix so it reaches the hash lookup.
- The raw key is shown once. Do not commit `api-key.json`, and do not paste the key into the skill or a pull request.
- This check applies on auth v1. It does not need `AUTH_GITHUB_ID`, a browser session, or a new Convex function.
