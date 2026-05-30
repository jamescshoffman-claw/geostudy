import { useState, useEffect } from 'react'
import { CONFIGS, type RegionKey } from './quizData'
import { fetchScores, type ScoreRow } from './scores'

interface QuizStat {
  key: string
  label: string
  total: number
  attempts: number
  bestScore: number
  bestElapsed: number | null
  got100: boolean
  attemptsTo100: number | null
}

const formatTime = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function HighScores() {
  const [rows, setRows] = useState<ScoreRow[] | null>(null)

  useEffect(() => {
    document.title = 'High Scores · Geo Study'
    fetchScores().then(setRows)
  }, [])

  const stats: QuizStat[] = (Object.keys(CONFIGS) as RegionKey[]).map(key => {
    const cfg = CONFIGS[key]
    const mine = (rows ?? []).filter(r => r.quiz_key === key)
    let best: ScoreRow | null = null
    for (const r of mine) {
      if (
        !best ||
        r.score > best.score ||
        (r.score === best.score && r.elapsed_seconds < best.elapsed_seconds)
      ) {
        best = r
      }
    }
    // Walk runs oldest→newest to count how many tries it took to first hit 100%.
    const chrono = [...mine].sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    )
    let attemptsTo100: number | null = null
    for (let i = 0; i < chrono.length; i++) {
      if (chrono[i].score >= chrono[i].total) {
        attemptsTo100 = i + 1
        break
      }
    }
    return {
      key,
      label: cfg.label,
      total: cfg.total,
      attempts: mine.length,
      bestScore: best ? best.score : 0,
      bestElapsed: best ? best.elapsed_seconds : null,
      got100: mine.some(r => r.score >= r.total),
      attemptsTo100,
    }
  })

  const perfectCount = stats.filter(s => s.got100).length

  return (
    <div className="hs-page">
      <div className="hs-header">
        <h1 className="hs-title">Your High Scores</h1>
        <p className="hs-subtitle">
          Your best run for each region, saved to your account.{' '}
          {perfectCount > 0
            ? `You've aced ${perfectCount} of ${stats.length} quizzes — keep going!`
            : 'Find every country in a region to earn a 100% badge.'}
        </p>
      </div>

      {rows === null ? (
        <p className="hs-empty">Loading your scores…</p>
      ) : (
        <div className="hs-table">
          <div className="hs-row hs-row--head">
            <span>Quiz</span>
            <span>Best</span>
            <span>%</span>
            <span>Best time</span>
            <span>Attempts</span>
            <span>100%</span>
            <span>Tries to 100%</span>
          </div>
          {stats.map(s => {
            const pct = s.attempts ? Math.round((s.bestScore / s.total) * 100) : 0
            return (
              <div className="hs-row" key={s.key}>
                <span className="hs-quiz">{s.label}</span>
                {s.attempts ? (
                  <>
                    <span className="hs-num">{s.bestScore}/{s.total}</span>
                    <span className="hs-num">{pct}%</span>
                    <span className="hs-num">
                      {s.bestElapsed != null ? formatTime(s.bestElapsed) : '—'}
                    </span>
                    <span className="hs-num">{s.attempts}</span>
                    <span>
                      {s.got100 ? (
                        <span className="hs-badge">✓ 100%</span>
                      ) : (
                        <span className="hs-dash">—</span>
                      )}
                    </span>
                    <span className="hs-num">
                      {s.attemptsTo100 != null
                        ? `${s.attemptsTo100} ${s.attemptsTo100 === 1 ? 'try' : 'tries'}`
                        : '—'}
                    </span>
                  </>
                ) : (
                  <span className="hs-notplayed">Not played yet</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
