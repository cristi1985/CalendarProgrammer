'use client'

import { createClient } from '@/lib/supabase'

export default function SignInPage() {
  const handleLogin = async () => {
    const supabase = createClient()

    await supabase.auth.signInWithOAuth({
      provider: 'google',
    })
  }

  return (
    <div>
      <h1>Sign in</h1>
      <button onClick={handleLogin}>Sign in with Google</button>
    </div>
  )
}
