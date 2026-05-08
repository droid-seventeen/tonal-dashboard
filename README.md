# Tonal Dashboard

A public, Vercel-friendly dashboard for multiple Tonal family members.

It shows:

- Current strength score: overall, upper, core, lower
- Muscle readiness and top recovered muscles
- Weekly workout volume
- Recent Tonal workouts
- Per-member tabs for the configured family

This is not affiliated with Tonal Systems, Inc. It uses unofficial API endpoints and should be treated as personal-use software.

## Why this app exists

I surveyed the available GitHub projects first. See `SURVEY.md`.

Short version: `JeffOtano/roni` is the strongest full app, but it is an AI coach with Convex/Gemini/auth infrastructure. For a simple shareable family dashboard, this repo intentionally stays lean: Next.js + Vercel + server-side Tonal calls + environment secrets.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Generate a refresh token for each Tonal family member:

```bash
npm run auth:token -- member@example.com
```

Put those refresh tokens into `.env.local`:

```bash
TONAL_MEMBERS_JSON='[
  {"id":"you","name":"You","refreshToken":"v1..."},
  {"id":"partner","name":"Partner","refreshToken":"v1..."}
]'
```

Optional avatar uploads use Vercel Blob and a separate upload code:

```bash
BLOB_READ_WRITE_TOKEN="vercel-blob-read-write-token"
AVATAR_ADMIN_TOKEN="choose-a-private-upload-code"
```

Then run locally:

```bash
npm run dev
```

With portless, the local URL is:

```text
http://tonal-dashboard.localhost:1355
```

If your local portless proxy is running HTTPS on 443 instead, use:

```text
https://tonal-dashboard.localhost
```

## Remote hosting on Vercel

Recommended simple path:

1. Push this repo to GitHub.
2. Create a new Vercel project from that GitHub repo.
3. Add these Vercel environment variables:
   - `TONAL_MEMBERS_JSON`
   - `BLOB_READ_WRITE_TOKEN` if member avatars should persist in Vercel Blob
   - `AVATAR_ADMIN_TOKEN` if avatar uploads should be enabled
4. Deploy.
5. Share the Vercel URL with family/friends.

No database is required.

## Member avatars

The public dashboard also requests `/api/avatars`. If Blob is not configured, that endpoint returns an empty avatar map and the dashboard falls back to initials.

To upload avatars, open the dashboard with the hidden hash route:

```text
https://your-dashboard.example/#minda
```

Enter the `AVATAR_ADMIN_TOKEN`, choose a configured Tonal member, and upload a jpeg, png, webp, or gif under 1 MB. SVG files are rejected. Uploaded images are public because they render on the public dashboard.

## Security model

- The dashboard itself is intentionally public; anyone with the URL can view the summarized family stats.
- Tonal refresh tokens are stored only in server-side environment variables.
- Avatar upload auth uses only the server-side `AVATAR_ADMIN_TOKEN`; the normal dashboard does not expose the upload panel unless the client hash is `#minda`.
- Uploaded avatar images are public Vercel Blob URLs.
- API responses sent to the browser are dashboard summaries, not the raw token bundle.
- Prefer refresh tokens over storing Tonal account passwords in Vercel.

## Commands

```bash
npm run dev        # local dev through portless
npm run build      # production build
npm run typecheck  # TypeScript check
npm test           # Vitest unit tests
npm run auth:token -- email  # securely prompt, then print Tonal refresh token
```

## Current verification

This repo currently verifies:

- Unit tests for member env parsing and metrics aggregation
- API and UI tests for avatar listing, upload validation, and the hidden admin panel
- TypeScript strict typecheck
- Next.js production build
- Local portless route smoke test
