import { NextResponse } from 'next/server'
import { createServerSupabaseClient, syncAuthenticatedUser } from '@/lib/auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  const supabase = createServerSupabaseClient()

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  const result = await syncAuthenticatedUser()

  if(!result?.tenantUser){
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return NextResponse.redirect(new URL('/app', request.url))
}
