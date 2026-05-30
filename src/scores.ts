import { supabase } from './supabase'

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

// Records a finished session. No-op when signed out — only logged-in users
// build a high-score history.
export async function saveScore(s: NewScore): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (!session) return

  const { error } = await supabase.from('quiz_scores').insert({
    user_id: session.user.id,
    quiz_key: s.quizKey,
    score: s.score,
    total: s.total,
    won: s.won,
    elapsed_seconds: s.elapsedSeconds,
  })
  if (error) console.error('Failed to save score:', error.message)
}

// All of the current user's recorded sessions (RLS limits this to their own rows).
export async function fetchScores(): Promise<ScoreRow[]> {
  const { data, error } = await supabase
    .from('quiz_scores')
    .select('quiz_key, score, total, won, elapsed_seconds, created_at')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Failed to fetch scores:', error.message)
    return []
  }
  return data ?? []
}
