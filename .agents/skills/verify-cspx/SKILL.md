---
name: verify-cspx
description: "Prove CSPX Tracker auth and MCP behavior by driving the real app: signed-out /dashboard, the GitHub sign-in handoff, POST /auth/refresh, and /api/mcp. Use when proxy.ts, /sign-in, /dashboard, /auth/refresh, or /api/mcp changes."
---

# Verify CSPX Tracker in the browser and over HTTP

CSPX Tracker (this repo) is a single-user Next.js app. Auth is Convex Auth v2 (`@convex-dev/auth` 2.0.0) with a GitHub provider. `proxy.ts` sends anonymous visitors from `/dashboard` to `/sign-in`. `POST /auth/refresh` with no session returns 401 and `{"tokens":null}`. `/api/mcp` accepts a personal API key (`Authorization: Bearer yaft_…`) and rejects anything else with 401.

This skill proves those surfaces against a **local anonymous Convex backend**. It does not log into GitHub, does not set `CONVEX_DEPLOY_KEY`, and does not read or write a cloud deployment's secrets.

`convex.config.ts` declares `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`, and `ALLOWED_GITHUB_LOGIN` as required, so `npx convex dev` will not push functions until they exist. If the local anonymous deployment has none, `launch.sh` sets non-secret placeholders (`verify-cspx-local`, `verify-cspx-local-not-a-secret`, `verify-cspx@localhost`) on that deployment only. It does not pass `--prod` and it does not print the values.

Run the checks in this order: Launch, Doctor, Drive, then Cleanup. Evidence stays on disk after Cleanup.

## Launch

From the repo root. Do not export `CONVEX_DEPLOY_KEY`. If it is already set, unset it before starting — a deploy key would point the CLI at a cloud deployment. Do not set `CONVEX_AGENT_MODE`.

On Convex 1.50, `npx convex dev` with no deploy key and with stdin not a terminal provisions a local anonymous backend by itself. Observed with `npx convex dev --once`: it printed `Setting up a new project...`, `Configured a local deployment for http://127.0.0.1:3210`, `[Local] Port 3210 • No Convex account`, and `Convex functions ready!`. It did not ask to log in.

```bash
unset CONVEX_DEPLOY_KEY
npx convex dev
```

Ports the local backend binds:

| Port | What |
| --- | --- |
| 127.0.0.1:3210 | Convex client URL. Written to `.env.local` as `NEXT_PUBLIC_CONVEX_URL`. |
| 127.0.0.1:3211 | Convex HTTP actions. Written as `NEXT_PUBLIC_CONVEX_SITE_URL`. GitHub's OAuth callback is `http://127.0.0.1:3211/oauth/github/callback`. |
| 127.0.0.1:6790 | Local Convex dashboard. |

Ready when the log prints `Convex functions ready!` and `curl -fsS http://127.0.0.1:3210/instance_name` prints the same name `.env.local` stored after `anonymous:`. A fresh run in this checkout wrote:

```text
CONVEX_DEPLOYMENT=anonymous:anonymous-workspace
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
NEXT_PUBLIC_CONVEX_SITE_URL=http://127.0.0.1:3211
```

`anonymous-workspace` is `anonymous-` plus the directory name. An existing `anonymous:` value in `.env.local` is reused instead.

In a second terminal, from the repo root:

```bash
npx next dev --port 3000
```

Ready when the log prints `Local: http://localhost:3000` and `Ready`, and `curl -fsS http://localhost:3000/sign-in` contains `Sign in with GitHub`.

The shipped helper runs those two commands, waits for those ready lines, and records the PIDs it started:

```bash
.agents/skills/verify-cspx/scripts/launch.sh
```

On Convex 1.50 this command printed `Your Convex AI files are out of date` and did not rewrite those files. It can still regenerate `convex/_generated/server.js` and `server.d.ts` (an `env` export). Restore that codegen if you did not mean to change it. Do not commit `.env.local` or `.convex/`.

If `.env.local` already names a deployment that does not start with `anonymous:`, stop. Do not point this skill at a cloud deployment.

## Doctor

One read-only check that the running instance is this app's local anonymous backend and that the sign-in page is up. It does not write data and does not set env vars.

```bash
.agents/skills/verify-cspx/scripts/doctor.sh
```

It passes only when all of these are true:

- `CONVEX_DEPLOY_KEY` is unset in the environment and absent from `.env.local`.
- `.env.local` has `CONVEX_DEPLOYMENT=anonymous:<name>`, `NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210`, and `NEXT_PUBLIC_CONVEX_SITE_URL=http://127.0.0.1:3211`.
- `curl -fsS http://127.0.0.1:3210/instance_name` prints that same `<name>`.
- `curl -fsS http://127.0.0.1:3210/` starts with `This Convex deployment is running.`
- `curl -fsS http://localhost:3000/sign-in` contains `Qian Inc.` and `Sign in with GitHub`.

A passing run prints `PASS doctor` and writes the same text to `$VERIFY_CSPX_EVIDENCE/doctor.txt` (default `/tmp/verify-cspx-evidence/doctor.txt`).

## Drive

Two harnesses. Playwright (Google Chrome, fresh context, no GitHub cookies) drives the pages. curl drives `/api/mcp`.

```bash
.agents/skills/verify-cspx/scripts/drive.sh
```

That installs Playwright under `/tmp/verify-cspx-playwright` (not into this repo), then runs:

1. `scripts/drive-ui.cjs` — signed-out `/dashboard`, then the GitHub button. See `features/signed-out-dashboard.md` and `features/github-sign-in.md`.
2. `scripts/refresh.sh` — `POST /auth/refresh` with no session. See `features/auth-refresh.md`.
3. `scripts/mcp.sh` — 401 with no key, 401 with a bad key, 200 with a key minted on the local deployment. See `features/mcp-api-key.md`.

Stdout is one `PASS` or `FAIL` line per check, plus the captured URL or response body. The process exits non-zero if any check fails. Do not loosen an assertion to make a run pass.

## Evidence

Default directory: `/tmp/verify-cspx-evidence` (`VERIFY_CSPX_EVIDENCE` overrides it). Cleanup does not delete this directory.

| File | Check |
| --- | --- |
| `convex-dev.log`, `next-dev.log`, `convex.pid`, `next.pid` | Processes this skill started. |
| `doctor.txt` | Doctor output. |
| `signed-out.json`, `dashboard-redirect-sign-in.png` | 307 from `/dashboard` to `/sign-in`, and the page. |
| `github-oauth.json`, `github-authorize.png` | GitHub URL after the button click. The JSON includes the authorize request URL and its `redirect_uri`. |
| `auth-refresh.headers`, `auth-refresh.body` | 401 `{"tokens":null}` from `POST /auth/refresh` with no session. |
| `mcp-no-key.headers`, `mcp-no-key.body` | 401 with no key. |
| `mcp-bad-key.headers`, `mcp-bad-key.body` | 401 with `Bearer yaft_not-a-real-key`. |
| `mcp-ok.headers`, `mcp-ok.body` | 200 initialize result. |
| `mcp-key-meta.txt` | Seeded user id and key prefix only. |
| `api-key.json` | Raw key, mode 600. Do not commit, print, or copy this file. |
| `cleanup.txt` | Written by cleanup, after the files above. |

When `/opt/cursor/artifacts` exists, `drive.sh` also copies the two screenshots there as `verify-cspx-dashboard-redirect-sign-in.png` and `verify-cspx-github-authorize.png`.

## Cleanup

Stop only the PIDs recorded in `$VERIFY_CSPX_EVIDENCE/convex.pid` and `next.pid`, including their child processes. Do not `pkill` or `killall` by name — other Convex or Next processes may belong to someone else.

```bash
.agents/skills/verify-cspx/scripts/cleanup.sh
```

The script sends SIGTERM to those PIDs, then SIGKILL if they are still alive after five seconds. It writes `cleanup.txt` and leaves every other evidence file where it is. Confirm the screenshots and response bodies are still there after it exits.

## Helpers

All of these live in `.agents/skills/verify-cspx/scripts/` and are executable. `.claude/skills/verify-cspx` is a symlink to that directory, same as `convex-verify`.

```bash
.agents/skills/verify-cspx/scripts/launch.sh
.agents/skills/verify-cspx/scripts/doctor.sh
.agents/skills/verify-cspx/scripts/drive.sh
.agents/skills/verify-cspx/scripts/cleanup.sh
```

`drive.sh` calls `scripts/refresh.sh`, `scripts/mcp.sh`, and `node scripts/drive-ui.cjs`. `scripts/lib.sh` is sourced for the repo root, evidence directory, and origin; do not execute it on its own.

Feature notes, selectors, and the local key-minting steps are in `features/README.md`.
