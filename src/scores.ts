import { supabase } from './supabase'

// Scores go through our own backend (worker/index.ts) rather than straight to
// Supabase: the client's only knowledge of the score store is the /api/scores
// contract below plus "forward the Supabase access token as a Bearer header".
// Supabase auth itself (login, session refresh) still lives client-side.

export interface ScoreRow {
  quiz_key: string
  score: number
  total: number
  won: boolean
  elapsed_seconds: number
  created_at: string
}

export interface NewScore {
  quizKey: string
  score: number
  total: number
  won: boolean
  elapsedSeconds: number
}

async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

// Records a finished session. No-op when signed out — only logged-in users
// build a high-score history.
export async function saveScore(s: NewScore): Promise<void> {
  const token = await accessToken()
  if (!token) return

  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(s),
    })
    if (!res.ok) {
      console.error('Failed to save score:', res.status, await res.text())
    }
  } catch (err) {
    console.error('Failed to save score:', err)
  }
}

// All of the current user's recorded sessions (the server scopes the query to
// the user identified by the token).
export async function fetchScores(): Promise<ScoreRow[]> {
  const token = await accessToken()
  if (!token) return []

  try {
    const res = await fetch('/api/scores', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      console.error('Failed to fetch scores:', res.status, await res.text())
      return []
    }
    return await res.json()
  } catch (err) {
    console.error('Failed to fetch scores:', err)
    return []
  }
}
