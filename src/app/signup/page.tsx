'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignUpPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleSignUp = async () => {
    const supabase = createClient()

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes:'https://www.googleapis.com/auth/calendar.events',
        queryParams:{
          prompt: 'select_account consent',
          access_type:'offline',
        }
      },
    })
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
        },
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    if (data.session) {
      window.location.href = '/auth/callback'
      return
    }

    setMessage('Account created. Check your email to confirm your account.')
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">
          Join an existing workspace by invitation or create a new workspace.
        </p>

        <form onSubmit={handleEmailSignUp} className="stack">
          <div>
            <label className="muted">Full name</label>
            <input
              className="input"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="muted">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="muted">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <p className="muted">{error}</p>}
          {message && <p className="muted">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up with email'}
          </button>
        </form>

        <hr className="auth-divider" />

        <div className="auth-actions">
          <button type="button" onClick={handleGoogleSignUp}>
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