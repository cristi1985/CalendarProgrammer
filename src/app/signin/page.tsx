'use client'

import { createClient } from '@/lib/supabase'

export default function SignInPage() {
  const handleLogin = async () => {
    const supabase = createClient()

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:{
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">
          Access your room booking workspace from desktop, iPhone, or Android.
        </p>

        <div className="auth-actions">
          <button type="button" onClick={handleLogin}>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  )
}
