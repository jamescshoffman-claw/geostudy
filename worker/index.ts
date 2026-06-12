// Backend API for geostudy, running as a Cloudflare Worker in front of the
// static assets. Requests under /api/* are handled here; everything else
// falls through to the SPA's static files.
//
// Auth model: the browser holds a Supabase session and forwards its access
// token as `Authorization: Bearer <token>`. This Worker verifies the token
// with Supabase, then reads/writes the database using the privileged secret
// key (set via `wrangler secret put SUPABASE_SECRET_KEY`, or .dev.vars
// locally). The secret key bypasses row-level security, so every query here
// must scope rows to the verified user explicitly.

interface Env {
  // Static-assets binding declared in wrangler.jsonc ("assets.binding").
  ASSETS: { fetch(request: Request): Promise<Response> }
  SUPABASE_URL: string
  SUPABASE_SECRET_KEY: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url)
    }
    // Not an API route: serve the built SPA (index.html fallback included,
    // via not_found_handling in wrangler.jsonc).
    return env.ASSETS.fetch(request)
  },
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  try {
    if (url.pathname === '/api/scores') {
      if (request.method === 'POST') return saveScore(request, env)
      if (request.method === 'GET') return listScores(request, env)
      return jsonError('Method not allowed', 405)
    }
    return jsonError('Not found', 404)
  } catch (err) {
    console.error('API error:', err)
    return jsonError('Internal error', 500)
  }
}

// ---------------------------------------------------------------------------
// Routes

// POST /api/scores — record a finished quiz session for the signed-in user.
async function saveScore(request: Request, env: Env): Promise<Response> {
  const userId = await verifyUser(request, env)
  if (!userId) return jsonError('Unauthorized', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Body must be JSON', 400)
  }

  const score = parseNewScore(body)
  if (!score) return jsonError('Invalid score payload', 400)

  // user_id comes from the verified token, never from the request body.
  const res = await supabaseRest(env, 'POST', '/rest/v1/quiz_scores', {
    user_id: userId,
    quiz_key: score.quizKey,
    score: score.score,
    total: score.total,
    won: score.won,
    elapsed_seconds: score.elapsedSeconds,
  })
  if (!res.ok) {
    console.error('Supabase insert failed:', res.status, await res.text())
    return jsonError('Failed to save score', 502)
  }
  return Response.json({ ok: true }, { status: 201 })
}

// GET /api/scores — all of the signed-in user's recorded sessions.
async function listScores(request: Request, env: Env): Promise<Response> {
  const userId = await verifyUser(request, env)
  if (!userId) return jsonError('Unauthorized', 401)

  const params = new URLSearchParams({
    select: 'quiz_key,score,total,won,elapsed_seconds,created_at',
    user_id: `eq.${userId}`,
    order: 'created_at.desc',
  })
  const res = await supabaseRest(env, 'GET', `/rest/v1/quiz_scores?${params}`)
  if (!res.ok) {
    console.error('Supabase select failed:', res.status, await res.text())
    return jsonError('Failed to fetch scores', 502)
  }
  return Response.json(await res.json())
}

// ---------------------------------------------------------------------------
// Helpers

// Confirms the forwarded Supabase access token is valid and returns the
// user's id, or null if missing/expired/forged.
async function verifyUser(request: Request, env: Env): Promise<string | null> {
  const auth = request.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  const token = auth.slice('Bearer '.length)

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) return null
  const user = (await res.json()) as { id?: unknown }
  return typeof user.id === 'string' ? user.id : null
}

interface NewScore {
  quizKey: string
  score: number
  total: number
  won: boolean
  elapsedSeconds: number
}

// Server-side validation: the client is untrusted, so reject anything that
// couldn't come from a real quiz run. (RLS used to be the only gate, and it
// only checked ownership — not plausibility.)
function parseNewScore(body: unknown): NewScore | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>

  const quizKey = b.quizKey
  const score = b.score
  const total = b.total
  const won = b.won
  const elapsedSeconds = b.elapsedSeconds

  if (typeof quizKey !== 'string' || quizKey.length === 0 || quizKey.length > 64) return null
  if (!Number.isInteger(total) || (total as number) < 1 || (total as number) > 10_000) return null
  if (!Number.isInteger(score) || (score as number) < 0 || (score as number) > (total as number)) return null
  if (typeof won !== 'boolean') return null
  // A real session lasts between 0 seconds and 24 hours.
  if (!Number.isInteger(elapsedSeconds) || (elapsedSeconds as number) < 0 || (elapsedSeconds as number) > 86_400) return null

  return {
    quizKey,
    score: score as number,
    total: total as number,
    won,
    elapsedSeconds: elapsedSeconds as number,
  }
}

// Calls Supabase's REST API (PostgREST) with the secret key. RLS is bypassed
// for these requests — callers are responsible for scoping by user_id.
function supabaseRest(env: Env, method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${env.SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}
