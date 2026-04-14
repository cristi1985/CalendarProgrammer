import { db } from '@/lib/db'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const DEFAULT_TENANT_NAME = 'Default Workspace'
const DEFAULT_TENANT_SLUG = 'default-workspace'

export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // ignored in contexts where cookies are read-only
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // ignored in contexts where cookies are read-only
          }
        },
      },
    }
  )
}

export async function requireSessionUser() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function syncAuthenticatedUser() {
  const authUser = await requireSessionUser()

  if (!authUser?.email) {
    return null
  }

  const fullName =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    authUser.email.split('@')[0]

  const user = await db.user.upsert({
    where: { email: authUser.email },
    update: { fullName },
    create: {
      email: authUser.email,
      fullName,
    },
  })

  const tenantUser = await db.tenantUser.findFirst({
    where: { userId: user.id },
    include: {
      tenant: true,
    },
  })
  
  return {
    authUser,
    user,
    tenantUser,
  }
}
