# CSPX Tracker checks

Drive these against the local anonymous backend from `../SKILL.md`. `scripts/drive.sh` runs them in this order.

| Feature | What a pass looks like |
| --- | --- |
| [signed-out-dashboard.md](signed-out-dashboard.md) | `GET /dashboard` with no session is a 307 to `/sign-in`, and the page shows the GitHub button. |
| [github-sign-in.md](github-sign-in.md) | Clicking **Sign in with GitHub** lands on `github.com/login/oauth/authorize`, or on `github.com/login` whose `return_to` contains that path. Nobody logs in. |
| [mcp-api-key.md](mcp-api-key.md) | `POST /api/mcp` is 401 with no key and with a bad key, and 200 with a key minted on this local deployment. |

All three apply on Convex Auth v1. The MCP success check does not need a new Convex function: it imports a `users` row and calls `apiKeys:createApiKey` with `npx convex run --identity`.
