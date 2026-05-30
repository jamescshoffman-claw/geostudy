import { useState, useEffect } from 'react'
import CountriesQuiz from './CountriesQuiz'
import { AuthButton } from './AuthButton'
import { HighScores } from './HighScores'
import { useSession } from './useSession'

type View = 'quiz' | 'highscores'

export default function App() {
  const { session } = useSession()
  const [view, setView] = useState<View>('quiz')

  // If the user signs out while viewing stats, send them back to the quiz.
  useEffect(() => {
    if (!session && view === 'highscores') setView('quiz')
  }, [session, view])

  return (
    <>
      <div className="top-bar">
        {session && (
          <button
            className="nav-btn"
            onClick={() => setView(v => (v === 'quiz' ? 'highscores' : 'quiz'))}
          >
            {view === 'quiz' ? '🏆 High Scores' : '← Back to Quiz'}
          </button>
        )}
        <AuthButton />
      </div>

      {view === 'quiz' ? <CountriesQuiz /> : <HighScores />}
    </>
  )
}
