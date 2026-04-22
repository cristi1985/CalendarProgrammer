'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from './actions'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const formData = new FormData()
    formData.set('email', email)

    startTransition(async () => {
      try {
        const result = await requestPasswordReset(formData)
        setMessage(result.message)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Forgot your password?</h1>
        <p className="auth-subtitle">
          Enter your email and we’ll send a reset link if that account supports password login.
        </p>

        <form onSubmit={handleSubmit} className="stack">
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

          {error && <p className="muted">{error}</p>}
          {message && <p className="muted">{message}</p>}

          <button type="submit" disabled={isPending}>
            {isPending ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <hr className="auth-divider" />

        <p className="muted">
          Back to <Link href="/signin">Sign in</Link>
        </p>

        <p className="muted">
          Password reset is available only for accounts that use email and password sign-in.
          If you use Google, sign in with Google instead.
        </p>
      </div>
    </div>
  )
}