# POST /auth/refresh with no session

## Sub-features

- `POST http://localhost:3000/auth/refresh` with no `__convexAuthRefreshToken` cookie returns 401.
- The body is exactly `{"tokens":null}`.

`app/auth/refresh/route.ts` mounts `auth.refreshHandler` from `@convex-dev/auth/ssr`. In `@convex-dev/auth` 2.0.0 that handler replies 401 with `{ tokens: null }` when the refresh cookie is missing. A POST whose `Origin` is missing or does not match `Host` is refused earlier, with 403 and the same JSON, and that is not this check.

## How to get to it (user POV)

A signed-out browser (or curl) posts to `/auth/refresh`. The app answers that there is no session. It does not set a cookie.

## Driving it with curl

`scripts/refresh.sh` (invoked by `scripts/drive.sh`) sends:

```bash
curl -sS --max-time 20 -D headers.txt -o body.txt \
  -X POST http://localhost:3000/auth/refresh \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  --data '{}'
```

Pass requires the status line to contain `401` and the body to be exactly `{"tokens":null}` after JSON parse (`{"tokens": null}` is the same value).

## Gotchas

- Do not drop the `Origin` header to "see what happens" and then accept 403. That is the cross-site refusal, not the no-session result.
- Do not accept 200. The installed handler does not use 200 for a missing session.
