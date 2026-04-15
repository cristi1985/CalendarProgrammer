import Link from 'next/link'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { logout } from './actions'

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

          <nav className="app-nav">
            <Link className="nav-link" href="/app/calendar">
              Calendar
            </Link>
            <Link className="nav-link" href="/app/bookings">
              Bookings
            </Link>
            <Link className="nav-link" href="/app/settings/rooms">
              Rooms
            </Link>
            <Link className="nav-link" href="/app/settings/invitations">
              Invitations
            </Link>

            <div className="nav-spacer" />

            <form action={logout}>
              <button type="submit" className="secondary">
                Logout
              </button>
            </form>
          </nav>
        </header>

        <main className="page-card">{children}</main>
      </div>
    </div>
  )
}