# Geo Study

Geography quiz site at [geostudy.org](https://geostudy.org). React SPA (Vite) plus a
small backend API, both served by a single Cloudflare Worker. Supabase provides
Google login and the Postgres database behind high scores.

## Architecture

```
browser (React app)
  │
  │  static files + /api/* over HTTPS (same origin)
  ▼
Cloudflare Worker (worker/index.ts)
  │   /api/* → verify Supabase token, validate, query DB with secret key
  │   else   → serve built SPA from dist/ (SPA fallback to index.html)
  ▼
Supabase (auth + Postgres)
```

- **Auth is client-side:** the browser talks to Supabase directly for Google
  login and session refresh (`src/supabase.ts`, `src/useSession.ts`), using the
  public *publishable* key.
- **Scores go through our API:** `src/scores.ts` calls `/api/scores` with the
  user's access token as a `Bearer` header; the Worker verifies the token and
  reads/writes `quiz_scores` using the *secret* key (`worker/index.ts`).
  Clients cannot write the table directly (the RLS insert policy was dropped —
  see `supabase/scores_api.sql`).
- **Travel path saves** (`src/travelPathStore.ts`) still talk to Supabase
  directly under RLS — candidate for migrating to the API the same way.

### The two Supabase keys

| Key | Lives | Purpose |
|---|---|---|
| Publishable (`sb_publishable_…`) | committed in `src/supabase.ts`, bundled into the site | identifies the project for client-side auth + RLS-guarded queries; safe to expose |
| Secret (`sb_secret_…`) | `.dev.vars` locally, `wrangler secret` in prod — **never committed** | full DB access bypassing RLS; Worker-only |

## Local development

One-time setup:

```sh
npm install
cp .dev.vars.example .dev.vars   # then paste the real secret key into .dev.vars
```

(Secret key: Supabase dashboard → Project Settings → API keys.)

Run **two terminals**:

```sh
npm run dev:worker   # backend: wrangler dev on http://localhost:8787
npm run dev          # frontend: vite, usually http://localhost:5173
```

Browse to the **Vite** URL. Vite proxies `/api/*` to the Worker on 8787
(`vite.config.js`), so the app uses the same relative URLs as production.
Start order doesn't matter, but score saves/fetches fail until the Worker is up.

Health checks:

```sh
curl localhost:8787/api/scores
# {"error":"Unauthorized"}  → Worker healthy (401 is correct without a token)
# connection refused        → dev:worker isn't running
# HTML                      → you curled the Vite port without the proxy working
```

## Pushing vs. deploying

These are **two separate actions** — pushing does not deploy:

```sh
git push          # saves code to GitHub (history/backup); does NOT touch the live site
npm run deploy    # vite build + wrangler deploy → updates geostudy.org
```

`npm run deploy` builds the SPA into `dist/` and uploads it together with the
Worker to Cloudflare. Live immediately on success. Verify with:

```sh
curl https://geostudy.org/api/scores        # expect {"error":"Unauthorized"}
npx wrangler deployments list | tail        # newest deployment timestamp
```

If `/api/scores` returns HTML instead of JSON, production is running a stale
deploy — run `npm run deploy` again and watch for errors.

## One-time provisioning (already done; recorded for rebuilds)

1. **Supabase tables/policies** — run in the Supabase SQL Editor, in order:
   `supabase/scores.sql`, `supabase/travel_path.sql`, then (only after the
   Worker API is deployed) `supabase/scores_api.sql`.
2. **Worker secret** — `npx wrangler secret put SUPABASE_SECRET_KEY` and paste
   the secret key at the prompt. The name `SUPABASE_SECRET_KEY` is the argument;
   the key itself goes into the prompt, not the command line. Secrets persist
   across deploys; this is needed once (or after rotating the key).
3. **Supabase auth redirects** — Google OAuth is the provider; localhost dev
   needs a `http://localhost:*` wildcard in Supabase's redirect allow-list.

If the secret key ever leaks (e.g. committed), rotate it in the Supabase
dashboard, update `.dev.vars`, and re-run `wrangler secret put` — deleting the
file from git is not enough once it has been pushed.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| High Scores empty, console shows JSON parse error | prod serving stale deploy (API falls through to SPA HTML) | `npm run deploy` |
| Every API call 401 despite being logged in | Worker has wrong/missing secret (check `npx wrangler secret list` shows `SUPABASE_SECRET_KEY`); locally, a stale `wrangler dev` started before `.dev.vars` had the real key | fix secret / restart `dev:worker` |
| Local API connection refused | `dev:worker` not running | start it |
| `wrangler dev` won't bind 8787 | orphaned `workerd` process squatting the port | `lsof -nP -iTCP:8787` then `kill` it |
| Vite comes up on an unexpected port | another vite instance (possibly orphaned) holds 5173 | harmless (proxy is port-independent), or kill the squatter |
