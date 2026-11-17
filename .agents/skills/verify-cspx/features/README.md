# CSPX Tracker checks

Drive these against the local anonymous backend from `../SKILL.md`. `scripts/drive.sh` runs them in this order.

| Feature | What a pass looks like |
| --- | --- |
| [signed-out-dashboard.md](signed-out-dashboard.md) | `GET /dashboard` with no session is a 307 to `/sign-in`, and the page shows the GitHub button. |
| [github-sign-in.md](github-sign-in.md) | Clicking **Sign in with GitHub** requests `github.com/login/oauth/authorize` whose `redirect_uri` ends in `/oauth/github/callback`. The browser may land on that URL or on `github.com/login` whose `return_to` contains it. Nobody logs in. |
| [auth-refresh.md](auth-refresh.md) | `POST /auth/refresh` with no session cookie and `Origin: http://localhost:3000` returns 401 and `{"tokens":null}`. |
| [mcp-api-key.md](mcp-api-key.md) | `POST /api/mcp` is 401 with no key and with a bad key, and 200 with a key minted on this local deployment. |

These checks target Convex Auth v2. The MCP success check does not need a new Convex function: it imports a `users` row, imports a session in the `auth` component, and calls `apiKeys:createApiKey` with `npx convex run --identity` whose subject is that session id.
