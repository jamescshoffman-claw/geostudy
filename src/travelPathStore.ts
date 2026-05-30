import { supabase } from './supabase'

// Maps challenge key → best (fewest) step count the user has solved it in.
export type Completions = Record<string, number>

const LS_KEY = 'geostudy:travelpath:completions'

function readLocal(): Completions {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Completions) : {}
  } catch {
    return {}
  }
}

function writeLocal(c: Completions): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(c)) } catch { /* storage unavailable */ }
}

const bestOf = (c: Completions, key: string, steps: number) =>
  key in c ? Math.min(c[key], steps) : steps

// Record a solved challenge, keeping the best (fewest) step count. Always writes
// to localStorage so completion works for everyone; additionally syncs to
// Supabase when signed in (cross-device). Supabase errors are swallowed so the
// feature keeps working before the travel_path_completions table is created.
export async function saveCompletion(challengeKey: string, steps: number): Promise<void> {
  const local = readLocal()
  const best = bestOf(local, challengeKey, steps)
  local[challengeKey] = best
  writeLocal(local)

  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (!session) return

  const { error } = await supabase
    .from('travel_path_completions')
    .upsert(
      {
        user_id: session.user.id,
        challenge_key: challengeKey,
        best_steps: best,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,challenge_key' },
    )
  if (error) console.error('Failed to save Travel Path completion:', error.message)
}

// Merge localStorage with the signed-in user's rows (keeping the best steps),
// and cache the result back to localStorage for offline display.
export async function fetchCompletions(): Promise<Completions> {
  const merged = { ...readLocal() }

  const { data: sess } = await supabase.auth.getSession()
  if (!sess.session) return merged

  const { data, error } = await supabase
    .from('travel_path_completions')
    .select('challenge_key, best_steps')
  if (error) return merged // table not created yet — fall back to local only

  for (const row of data ?? []) {
    merged[row.challenge_key] = bestOf(merged, row.challenge_key, row.best_steps)
  }
  writeLocal(merged)
  return merged
}
