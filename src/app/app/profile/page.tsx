import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { toggleGoogleCalendarSync } from './actions'

type SearchParams = {
  month?: string
}

function getUserProviders(
  authProvider?: string | null,
  providers?: string[] | null
) {
  const safeProviders = providers ?? []
  const safeAuthProvider = authProvider ?? null

  return {
    providers: safeProviders,
    authProvider: safeAuthProvider,
    hasEmailProvider: safeProviders.includes('email'),
    hasGoogleProvider: safeProviders.includes('google'),
  }
}

function formatProviders(providers: string[]) {
    if (providers.length === 0) {
        return 'No providers'
    }

    return providers.join(',')
}



function formatMonthInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
}

function getSelectedMonth(month?: string) {
  if (!month) {
    return new Date()
  }

  const parsed = new Date(`${month}-01T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }

  return parsed
}

function getMonthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

function getHours(startAt: Date, endAt: Date) {
  return (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60)
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  const selectedMonthDate = getSelectedMonth(searchParams.month)
  const { start, end } = getMonthBounds(selectedMonthDate)
  const isOwner = result.tenantUser.role === 'owner'
  const providersInfo = getUserProviders(result.user.authProvider, result.user.providers)
  const googleCalendarIntegration = await db.googleCalendarIntegration.findUnique({
    where: {
      userId: result.user.id,
    },
  })

  const isGoogleCalendarSyncEnabled = googleCalendarIntegration?.enabled ?? false

  if (!isOwner) {
    const bookings = await db.booking.findMany({
      where: {
        tenantId: result.tenantUser.tenantId,
        userId: result.user.id,
        startAt: { gte: start },
        endAt: { lte: end },
      },
      orderBy: {
        startAt: 'asc',
      },
    })

    const bookedHours = bookings.reduce(
      (sum, booking) =>
        sum + getHours(new Date(booking.startAt), new Date(booking.endAt)),
      0
    )

    return (
      <div className="stack">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="muted">View your booked hours by month.</p>
        </div>
        <GoogleCalendarSyncToggle isConnected={!!googleCalendarIntegration} isEnabled={isGoogleCalendarSyncEnabled} />

        <section className="card-item">
          <h2 className="section-title">User details</h2>
          <div className="stack">
            <div>
              <strong>Name:</strong> {result.user.fullName}
            </div>
            <div>
              <strong>Email:</strong> {result.user.email}
            </div>
            <div>
              <strong>Workspace role:</strong> {result.tenantUser.role}
            </div>
            <div>
              <strong>Permanent user:</strong>{' '}
              {result.tenantUser.isPermanent ? 'Yes' : 'No'}
            </div>
            <div>
                <strong>Sign-in methods:</strong> {formatProviders(providersInfo.providers)}
                </div>
                <div>
                <strong>Password reset available:</strong>{' '}
                {providersInfo.hasEmailProvider ? 'Yes' : 'No'}
                </div>
                {!providersInfo.hasEmailProvider && providersInfo.hasGoogleProvider && (
                <div className="muted">
                    This account uses Google sign-in. Use Google to access your account.
                </div>
                )}
          </div>
        </section>

        <section className="card-item">
          <h2 className="section-title">Booked hours by month</h2>

          <form method="get" className="stack" style={{ marginBottom: 16 }}>
            <div className="form-grid">
              <div>
                <label className="muted">Month</label>
                <input
                  className="input"
                  type="month"
                  name="month"
                  defaultValue={formatMonthInput(selectedMonthDate)}
                />
              </div>
            </div>

            <div>
              <button className="button" type="submit">
                View month
              </button>
            </div>
          </form>

          <div className="stack">
            <div>
              <strong>Bookings in selected month:</strong> {bookings.length}
            </div>
            <div>
              <strong>Hours booked in selected month:</strong>{' '}
              {bookedHours % 1 === 0 ? bookedHours : bookedHours.toFixed(1)}
            </div>
          </div>
        </section>
      </div>
    )
  }

  const tenantUsers = await db.tenantUser.findMany({
    where: {
      tenantId: result.tenantUser.tenantId,
    },
    include: {
      user: true,
    },
    orderBy: {
      user: {
        fullName: 'asc',
      },
    },
  })

  const bookings = await db.booking.findMany({
    where: {
      tenantId: result.tenantUser.tenantId,
      startAt: { gte: start },
      endAt: { lte: end },
    },
    include: {
      user: true,
    },
    orderBy: {
      startAt: 'asc',
    },
  })

  const summary = tenantUsers.map((tenantUser) => {
    const userBookings = bookings.filter(
      (booking) => booking.userId === tenantUser.userId
    )

    const hours = userBookings.reduce(
      (sum, booking) =>
        sum + getHours(new Date(booking.startAt), new Date(booking.endAt)),
      0
    )

    return {
      id: tenantUser.userId,
      fullName: tenantUser.user.fullName,
      email: tenantUser.user.email,
      role: tenantUser.role,
      isPermanent: tenantUser.isPermanent,
      bookingsCount: userBookings.length,
      hours,
    }
  })

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="muted">
          Billing overview for your workspace by month.
        </p>
      </div>

      <section className="card-item">
        <section className="card-item">
            <h2 className="section-title">Your account</h2>
            <div className="stack">
                <div>
                <strong>Name:</strong> {result.user.fullName}
                </div>
                <div>
                <strong>Email:</strong> {result.user.email}
                </div>
                <div>
                <strong>Sign-in methods:</strong> {formatProviders(providersInfo.providers)}
                </div>
                <div>
                <strong>Password reset available:</strong>{' '}
                {providersInfo.hasEmailProvider ? 'Yes' : 'No'}
                </div>
                {!providersInfo.hasEmailProvider && providersInfo.hasGoogleProvider && (
                <div className="muted">
                    This account uses Google sign-in. Password reset is not available.
                </div>
                )}
            </div>
        </section>
        <section className="card-item">
        <div>
           <h2 className="section-title">Workspace owner view</h2>         
        </div>
            <form method="get" className="stack" style={{ marginBottom: 16 }}>
          <div className="form-grid">
            <div>
              <label className="muted">Month</label>
              <input
                className="input"
                type="month"
                name="month"
                defaultValue={formatMonthInput(selectedMonthDate)}
              />
            </div>
          </div>

          <div>
            <button className="button" type="submit">
              View summary
            </button>
            <a className="nav-link" href={`/app/profile/export?month=${formatMonthInput(selectedMonthDate)}`}>Export CSV</a>
          </div>
        </form>

        <div className="card-list">
          {summary.map((item) => (
            <div key={item.id} className="card-item">
              <div>
                <strong>{item.fullName}</strong>
              </div>
              <div className="muted">{item.email}</div>
              <div className="muted">Role: {item.role}</div>
              <div className="muted">
                Permanent: {item.isPermanent ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Bookings:</strong> {item.bookingsCount}
              </div>
              <div>
                <strong>Hours:</strong>{' '}
                {item.hours % 1 === 0 ? item.hours : item.hours.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
        </section>
        
        

        
      </section>
    </div>
  )
}

function GoogleCalendarSyncToggle({
   isConnected,
   isEnabled,
}: {
    isConnected: boolean
    isEnabled: boolean
}) {
    return (
      <div className="stack">
        <div>
          <strong>Google Calendar Sync:</strong>{' '}
          {isConnected ? isEnabled ? 'Enabled' : 'Disabled' : 'Not connected'}
        </div>
       {!isConnected && (
        <div className="muted">
          Connect your Google Calendar to sync your bookings with your calendar.      
      </div>)}
       {isConnected && (
        <form action={toggleGoogleCalendarSync}>
            <input
              type="hidden"
              name="enabled"
              value={isEnabled ? 'false' : 'true' }
            />
          <button type ="submit" className={ isEnabled ? 'secondary': 'button'}>
            {isEnabled ? 'Disable' : 'Enable'} Google Calendar Sync
          </button>
         
        </form>
       )}
      </div>
    )
  }
  