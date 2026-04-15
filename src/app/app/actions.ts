'use server'

import { createServerSupabaseClient } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function logout() {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/signin')
}
