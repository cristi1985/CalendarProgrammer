'use client'

import { createClient } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setMessage(null)

        if (password !== confirmPassword) {
            setError("Passwords do not match.")
            return
        }
        setLoading(true) 
        const supabase = createClient()

        const { error } = await supabase.auth.updateUser({
            password,
        })
        if(error) {
            setError(error.message)
            setLoading(false)
            return
        }

        setMessage("Password reset successful! You can now sign in with your new password.")

        setTimeout(() => {
            router.push('/signin')
        }, 1200)        
    }

    return (
        <div className="auth-shell">
            <div className="auth-card">
                <h1 className="auth-title">Reset your password</h1>
                <p className="auth-subtitle">
                    Enter your new password below.
                </p>
                <form onSubmit={handleResetPassword} className="stack">
                    <div>
                        <label className="muted">New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-input"
                            placeholder="Enter your new password"
                        />
                    </div>
                    <div>
                        <label className="muted">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="form-input"
                            placeholder="Confirm your new password"
                        />
                    </div>
                    {error && <p className="text-danger">{error}</p>}
                    {message && <p className="text-success">{message}</p>}
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>

                <hr className="auth-divider" />
                <p className="muted">
                    Back to <Link href="/signin">Sign in</Link>
                </p>
            </div>
        </div>
    )
}