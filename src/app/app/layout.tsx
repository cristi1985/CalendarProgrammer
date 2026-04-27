import Link from 'next/link'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { logout } from './actions'
import AppNav from './appnav'
import ThemeSelector from './ThemeSelector'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  return (
     <div className="app-shell">
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">Calendar Programmer</h1>
          <p className="app-subtitle">
            Welcome {result.user.fullName} — {result.tenantUser.tenant.name}
          </p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <AppNav />

            <div className="nav-spacer" />

            <ThemeSelector />

            <form action={logout}>
              <button type="submit" className="secondary">
                Logout
              </button>
            </form>
          </div>
        </header>

        <main className="page-card">{children}</main>
      </div>
    </div>
  )
}
