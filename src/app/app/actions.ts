'use server'

import { createServerSupabaseClient } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function logout() {
  const supabase = createServerSupabaseClient()
  const {error} =await (await supabase).auth.signOut()
  if(error){
    console.error('Error signing out:', error.message)
    throw new Error('Error signing out: ' + error.message)
  }
  redirect('/signin')
}
