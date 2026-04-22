'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    const supabase = createClient()

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/auth/callback')
    router.refresh()
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">
          Access your workspace from desktop, iPhone, or Android.
        </p>

        <form onSubmit={handleEmailLogin} className="stack">
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
            />
          </div>

          {error && <p className="muted">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in with email'}
          </button>
        </form>
        <p className="muted">
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="muted">
          Forgot password works only for email/password accounts. Google users should
          sign in with Google.
        </p>

        <hr className="auth-divider" />

        <div className="auth-actions">
          <button type="button" onClick={handleGoogleLogin}>
            Sign in with Google
          </button>
        </div>

        <hr className="auth-divider" />

        <p className="muted">
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  )
}