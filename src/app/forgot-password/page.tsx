'use client'

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const supabase = createClient()

    const {error} = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
    })

    setLoading(false)

    if (error) {
        setError(error.message)
        return
    }

    setMessage("Password reset email sent!")
    }

    return (
        <div className="auth-shell">
            <div className="auth-card">
                <h1 className="auth-title">Forgot your password?</h1>
                <p className="auth-subtitle">
                    Enter your email and we'll send you a link to reset your password.
                </p>
                <form onSubmit={handleReset} className="stack">
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
                    {error && <p className="error">{error}</p>}
                    {message && <p className="success">{message}</p>}

                    <button className="submit" disabled={loading}>
                        {loading ? "Sending..." : "Send reset link"}
                    </button>

                    <hr className="auth-divider" />
                    <p className="muted">
                        Back to <Link href="/signin">Sign in</Link>
                    </p>
                </form>
            </div>
        </div>
    )
}