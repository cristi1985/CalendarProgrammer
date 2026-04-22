'use server'

import { db } from "@/lib/db"
import { createServerSupabaseClient } from "@/lib/auth"

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email')

  if (typeof email !== 'string' || !email.trim()) {
    throw new Error('Email is required.')
  }

  const normalizedEmail = email.trim().toLowerCase()

  const user = await db.user.findUnique({
    where: { 
        email: normalizedEmail,
     },
     select: {
       provider: true,
     },
  })

  const hasEmailProvider = user?.providers?.includes('email') ?? false

  if (!hasEmailProvider) {
    const supabase = createServerSupabaseClient()

    await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password`
    })
  }

  return {
    message: "If that account supports password reset, a reset link has been sent."
  }
}