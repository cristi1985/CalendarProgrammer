'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignUpPage() {
  const handleSignUp = async () => {
    const supabase = createClient() 

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:{
        redirectTo: `${window.location.origin}/auth/callback`
      },
    })
    }

    return(
        <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">
          Join an existing workspace by invitation or create a new workspace for
          your practice.
        </p>

        <div className="auth-actions">
          <button type="button" onClick={handleSignUp}>
            Continue with Google
          </button>
        </div>

        <hr className="auth-divider" />

        <p className="muted">
          Already have an account? <Link href="/signin">Sign in</Link>
        </p>
      </div>
    </div>
    )
}