import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 820 }}>
        <h1 className="auth-title">Privacy Policy</h1>
        <p className="auth-subtitle">Last updated: May 15, 2026</p>

        <div className="stack">
          <section>
            <h2 className="section-title">Overview</h2>
            <p className="muted">
              Calendar Programmer is a room booking and workspace calendar management application.
              This policy explains what information the application uses and how it is handled.
            </p>
          </section>

          <section>
            <h2 className="section-title">Information we collect</h2>
            <p className="muted">
              The application stores account information such as your name, email address, sign-in
              provider, workspace membership, role, and booking activity. Bookings may include room,
              date, time, booking type, client name, and the user who created the booking.
            </p>
          </section>

          <section>
            <h2 className="section-title">Google account and calendar data</h2>
            <p className="muted">
              If you sign in with Google or enable Google Calendar sync, the application may store
              Google OAuth tokens required to keep your booking events synchronized. When calendar
              sync is enabled, the application uses Google Calendar access to create, update, and
              delete events that correspond to bookings created or managed through this application.
            </p>
            <p className="muted">
              The application does not use Google Calendar access to read, modify, or delete unrelated
              calendar events except as needed to maintain events created by this application.
            </p>
          </section>

          <section>
            <h2 className="section-title">How information is used</h2>
            <p className="muted">
              Information is used to authenticate users, manage workspace access, create and display
              bookings, enforce booking permissions, calculate booking summaries, send invitations,
              and synchronize booking events with Google Calendar when enabled by the user.
            </p>
          </section>

          <section>
            <h2 className="section-title">Data sharing</h2>
            <p className="muted">
              Booking information is visible to authorized users in the same workspace according to
              their role and permissions. Calendar data is sent to Google Calendar only when the user
              enables Google Calendar sync. We do not sell personal data.
            </p>
          </section>

          <section>
            <h2 className="section-title">Data storage and security</h2>
            <p className="muted">
              Application data is stored in the configured database and authentication is handled using
              Supabase Auth. Access to server-side database credentials and OAuth secrets should be
              restricted to server environments such as deployment environment variables.
            </p>
          </section>

          <section>
            <h2 className="section-title">User control</h2>
            <p className="muted">
              Users can disable Google Calendar sync from their profile. Disabling sync stops future
              synchronization. Existing Google Calendar events created earlier may remain unless they
              are cancelled or removed by the user.
            </p>
          </section>

          <section>
            <h2 className="section-title">Contact</h2>
            <p className="muted">
              For privacy questions or data requests, contact the workspace administrator or the
              application operator responsible for this deployment.
            </p>
          </section>

          <p className="muted">
            <Link href="/signin">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
