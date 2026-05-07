# GitHub survey: Tonal dashboard/API foundations

Survey date: 2026-05-07.

## Candidates checked

| Repo | Stars | Stack | Fit for this project | Notes |
| --- | ---: | --- | --- | --- |
| `JeffOtano/roni` | 14 | Next.js 16 + Convex + Gemini | Strong but heavy | Best maintained full app. Has encrypted Tonal tokens, cron refresh, dashboard, AI coach, workout push. Requires Convex, Gemini, app auth, more operational surface than a simple family dashboard. |
| `curlrequests/toneget` | 25 | Python exporter | Useful reference | Best focused data-export utility. Good workout-history export model and legal/privacy framing. Not a hosted dashboard foundation. |
| `danmarai/tonal-api` | 1 | Python CLI/MCP + docs | Useful API reference | Clean endpoint docs and simple auth examples. Good source for exact Tonal endpoints; not a web app. |
| `lisajill/Tonal-Workout-Log` | 1 | Vite React static dashboard | Visual inspiration only | Has a personal dashboard UI with static JSON data and no tests. Not suited for multi-family hosted auth. |

## Decision

Build a lean custom Next.js app rather than fork a large existing app.

Rationale:

1. Family sharing needs a small private dashboard, not AI coaching, Convex, Gemini, or workout-push flows.
2. Vercel + Next.js gives the simplest remote hosting path: one project, serverless routes, env secrets, no database.
3. Tonal credentials stay server-side; the browser only sees normalized dashboard data.
4. The code remains small enough to audit and customize.
5. The app can still borrow API endpoint knowledge from `danmarai/tonal-api` and data-shape ideas from `toneget`.

## Hosting choice

Vercel.

Why: simple GitHub import, free-tier friendly for a private family dashboard, built-in HTTPS, environment variable management, serverless functions for Tonal API calls, and native Next.js support.

Tradeoff: Vercel serverless memory cache is ephemeral. That is acceptable because each request can refresh Tonal tokens from each member's refresh token.
