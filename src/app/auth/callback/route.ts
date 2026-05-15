import { NextResponse } from 'next/server'
import { createServerSupabaseClient, syncAuthenticatedUser } from '@/lib/auth'
import { db } from '@/lib/db' 

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  const supabase = createServerSupabaseClient()

  
  const {error} =  await supabase.auth.exchangeCodeForSession(code)

  if(error){
    return NextResponse.redirect(new URL('/signin', request.url))
  }
  
  const{
    data:{session},
  } = await supabase.auth.getSession()

  const result = await syncAuthenticatedUser()

  if (!result) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  if(session?.provider_token || session?.provider_refresh_token){
    await db.googleCalendarIntegration.upsert({
      where:{
        userId: result.user.id,
      },
      update : {
        accessToken : session.provider_token,
        refreshToken: session.provider_refresh_token,
      },
      create: {
        userId: result.user.id,
        accessToken: session.provider_token,
        refreshToken: session.provider_refresh_token,
        calendarId:'primary',
        enabled:false,
      },
    })
  }

   if(!result?.tenantUser){
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return NextResponse.redirect(new URL('/app', request.url))
}
