import Link from 'next/link'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

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
    <div>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Calendar Programmer</h1>

        <div style={{ marginBottom: 12 }}>
          Welcome {result.user.fullName} — {result.tenantUser.tenant.name}
        </div>

        <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/app/calendar">Calendar</Link>
          <Link href="/app/bookings">Bookings</Link>
          <Link href="/app/settings/rooms">Rooms</Link>
          <Link href="/app/settings/invitations">Invitations</Link>
        </nav>
      </header>

      <main>{children}</main>
    </div>
  )
}