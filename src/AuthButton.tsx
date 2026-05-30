import { supabase } from './supabase'
import { useSession } from './useSession'

export function AuthButton() {
  const { session, loading } = useSession()

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return null

  if (!session) {
    return (
      <div className="auth-widget">
        <button className="auth-google-btn" onClick={signIn}>
          <GoogleIcon />
          <span>Sign in with Google</span>
        </button>
      </div>
    )
  }

  const user = session.user
  const name =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email ||
    'Account'
  const avatar = user.user_metadata?.avatar_url as string | undefined

  return (
    <div className="auth-widget auth-widget--signedin">
      {avatar ? (
        <img className="auth-avatar" src={avatar} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span className="auth-avatar auth-avatar-fallback">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="auth-user-name" title={name}>{name}</span>
      <button className="auth-signout-btn" onClick={signOut}>
        Sign out
      </button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}
