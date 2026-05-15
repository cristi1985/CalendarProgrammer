import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 860 }}>
        <h1 className="auth-title">CalendarProgrammer</h1>
        <p className="auth-subtitle">
          Room booking and workspace calendar management for clinics, offices,
          and small teams.
        </p>

        <div className="stack">
          <section>
            <h2 className="section-title">What CalendarProgrammer does</h2>
            <p className="muted">
              CalendarProgrammer helps workspaces manage shared rooms, create
              bookings, invite team members, view calendar schedules, and track
              booked hours. Users can create bookings with room, date, time,
              booking type, and client name details.
            </p>
          </section>

          <section>
            <h2 className="section-title">Google Calendar integration</h2>
            <p className="muted">
              Users may optionally enable Google Calendar sync from their
              profile. When enabled, CalendarProgrammer creates, updates, and
              deletes Google Calendar events that correspond to bookings created
              or managed inside the application.
            </p>
          </section>

          <section>
            <h2 className="section-title">Access</h2>
            <p className="muted">
              Existing users can sign in to access their workspace. New users can
              create an account or join a workspace by invitation.
            </p>
          </section>

          <div className="auth-actions">
            <Link className="nav-link" href="/signin">
              Sign in
            </Link>
            <Link className="nav-link" href="/signup">
              Create account
            </Link>
          </div>

          <p className="muted">
            <Link href="/privacy">Privacy Policy</Link>{' '}
            ·{' '}
            <Link href="/terms">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
