import Link from 'next/link'

export default function TermsOfServicePage() {
  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 820 }}>
        <h1 className="auth-title">Terms of Service</h1>
        <p className="auth-subtitle">Last updated: May 15, 2026</p>

        <div className="stack">
          <section>
            <h2 className="section-title">Agreement to these terms</h2>
            <p className="muted">
              By accessing or using Calendar Programmer, you agree to these Terms of Service. If you
              do not agree, do not use the application.
            </p>
          </section>

          <section>
            <h2 className="section-title">Application purpose</h2>
            <p className="muted">
              Calendar Programmer is provided to help workspaces manage rooms, users, bookings,
              invitations, booking summaries, and optional Google Calendar synchronization.
            </p>
          </section>

          <section>
            <h2 className="section-title">User accounts and access</h2>
            <p className="muted">
              Users are responsible for maintaining access to their sign-in method and for using the
              application only within workspaces where they are authorized. Workspace roles control
              what actions users can perform.
            </p>
          </section>

          <section>
            <h2 className="section-title">Bookings and workspace data</h2>
            <p className="muted">
              Users are responsible for entering accurate booking details, including room, time, booking
              type, and client name. Workspace administrators are responsible for managing rooms,
              invitations, roles, and workspace configuration.
            </p>
          </section>

          <section>
            <h2 className="section-title">Google Calendar sync</h2>
            <p className="muted">
              If Google Calendar sync is enabled, the application may create, update, and delete Google
              Calendar events corresponding to bookings managed through the application. Users can
              disable sync from their profile. Google Calendar availability and behavior may depend on
              Google services and permissions granted by the user.
            </p>
          </section>

          <section>
            <h2 className="section-title">Acceptable use</h2>
            <p className="muted">
              You agree not to misuse the application, interfere with its operation, attempt unauthorized
              access, or use it to store unlawful, harmful, or misleading information.
            </p>
          </section>

          <section>
            <h2 className="section-title">Availability and changes</h2>
            <p className="muted">
              The application may change over time and may not always be available. Features may be
              modified, added, or removed as the application evolves.
            </p>
          </section>

          <section>
            <h2 className="section-title">No warranty</h2>
            <p className="muted">
              The application is provided as is, without warranties of any kind. Users and workspace
              administrators should verify important booking and calendar information independently.
            </p>
          </section>

          <section>
            <h2 className="section-title">Limitation of liability</h2>
            <p className="muted">
              To the maximum extent permitted by law, the application operator is not liable for indirect,
              incidental, consequential, or business losses related to use of the application, booking
              errors, calendar sync failures, or service interruptions.
            </p>
          </section>

          <section>
            <h2 className="section-title">Contact</h2>
            <p className="muted">
              For questions about these terms, contact the workspace administrator or the application
              operator responsible for this deployment.
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
