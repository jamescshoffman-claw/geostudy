import { useState, useEffect } from 'react'
import CountriesQuiz from './CountriesQuiz'
import TravelPath from './TravelPathGame'
import { AuthButton } from './AuthButton'
import { HighScores } from './HighScores'
import { useSession } from './useSession'

type View = 'quiz' | 'highscores'

const cleanPath = (path: string) => path.replace(/\/+$/, '') || '/'
const isTravelPath = (path: string) => cleanPath(path) === '/travelpath'
const isArchive = (path: string) => cleanPath(path) === '/archive'

export default function App() {
  const { session } = useSession()
  const [view, setView] = useState<View>('quiz')
  const [path, setPath] = useState(() => window.location.pathname)

  // Keep React state in sync with browser back/forward navigation.
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (to: string) => {
    if (window.location.pathname !== to) window.history.pushState({}, '', to)
    setPath(to)
  }

  // If the user signs out while viewing stats, send them back to the quiz.
  useEffect(() => {
    if (!session && view === 'highscores') setView('quiz')
  }, [session, view])

  const onTravelPath = isTravelPath(path)
  const onArchive = isArchive(path)
  const onTravel = onTravelPath || onArchive

  return (
    <>
      <div className="top-bar">
        {onTravel ? (
          <>
            {onTravelPath ? (
              <button className="nav-btn" onClick={() => navigate('/archive')}>
                🗓 Archive
              </button>
            ) : (
              <button className="nav-btn" onClick={() => navigate('/travelpath')}>
                🧭 Daily
              </button>
            )}
            <button className="nav-btn" onClick={() => navigate('/')}>
              ← Geo Study
            </button>
          </>
        ) : (
          <>
            <button className="nav-btn" onClick={() => navigate('/travelpath')}>
              🧭 Travel Path
            </button>
            {session && (
              <button
                className="nav-btn"
                onClick={() => setView(v => (v === 'quiz' ? 'highscores' : 'quiz'))}
              >
                {view === 'quiz' ? '🏆 High Scores' : '← Back to Quiz'}
              </button>
            )}
          </>
        )}
        <AuthButton />
      </div>

      {onTravel
        ? <TravelPath mode={onArchive ? 'archive' : 'daily'} onNavigate={navigate} />
        : view === 'quiz' ? <CountriesQuiz /> : <HighScores />}
    </>
  )
}
