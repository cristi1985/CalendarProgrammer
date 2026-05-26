import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 820 }}>
        <h1 className="auth-title">Privacy Policy</h1>
        <p className="auth-subtitle">Last updated: May 26, 2026</p>

        <div className="stack">
          <section>
            <h2 className="section-title">Overview</h2>
            <p className="muted">
              This Privacy Policy explains how CalendarProgrammer collects, uses, stores, protects,
              and deletes personal information when you use the application.
            </p>
            <p className="muted">
              CalendarProgrammer is a room booking and workspace calendar management application.
              This policy also explains how CalendarProgrammer handles Google user data when you
              sign in with Google or enable Google Calendar synchronization.
            </p>
          </section>

          <section>
            <h2 className="section-title">Information We Collect</h2>
            <p className="muted">
              CalendarProgrammer may collect personal information that you provide directly or that
              is made available through your use of the application. This may include your name,
              email address, account information, sign-in provider, workspace membership, role,
              and booking activity.
            </p>
            <p className="muted">
              Bookings may include room, date, time, booking type, client name, and the user who
              created or managed the booking. If CalendarProgrammer integrates with Google APIs,
              the application may access Google user data only as necessary to provide the features
              you have requested or authorized.
            </p>
          </section>

          <section>
            <h2 className="section-title">Google Account and Calendar Data</h2>
            <p className="muted">
              If you sign in with Google or enable Google Calendar sync, CalendarProgrammer may
              store Google OAuth tokens required to keep your booking events synchronized. When
              calendar sync is enabled, CalendarProgrammer uses Google Calendar access to create,
              update, and delete events that correspond to bookings created or managed through the
              application.
            </p>
            <p className="muted">
              CalendarProgrammer does not use Google Calendar access to read, modify, or delete
              unrelated calendar events except as needed to maintain events created by the application.
            </p>
          </section>

          <section>
            <h2 className="section-title">How We Use Your Information</h2>
            <p className="muted">
              CalendarProgrammer uses personal information to provide, operate, and maintain the
              application; authenticate users; manage workspace access; create and display bookings;
              enforce booking permissions; calculate booking summaries; send invitations; communicate
              with users about the application; maintain security; prevent misuse; comply with legal
              obligations; and synchronize booking events with Google Calendar when enabled by the user.
            </p>
            <p className="muted">
              CalendarProgrammer does not sell Google user data or use it for purposes unrelated to
              providing or improving the services described in this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="section-title">Protection of Google User Data</h2>
            <p className="muted">
              CalendarProgrammer takes appropriate technical and organizational measures to protect
              Google user data against unauthorized access, disclosure, alteration, or destruction.
              Security procedures are in place to help protect the confidentiality and integrity of
              your data.
            </p>
            <p className="muted">
              CalendarProgrammer uses encryption, including HTTPS/TLS where applicable, to protect
              information transmitted between your device, the application, and Google services. Where
              Google user data is stored, CalendarProgrammer uses reasonable safeguards designed to
              protect it from unauthorized access.
            </p>
            <p className="muted">
              Access to Google user data is limited to authorized personnel, systems, or service
              providers who need access to provide and maintain CalendarProgrammer.
            </p>
            <p className="muted">
              CalendarProgrammer&apos;s use and transfer of information received from Google APIs adheres
              to the Google API Services User Data Policy, including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="section-title">Data Retention and Deletion</h2>
            <p className="muted">
              CalendarProgrammer retains personal information, including Google user data where
              applicable, only for as long as necessary to fulfill the purposes described in this
              Privacy Policy, provide and maintain the application, comply with legal obligations,
              resolve disputes, enforce agreements, and support legitimate business purposes.
            </p>
            <p className="muted">
              CalendarProgrammer stores your personal information for a period of time that is
              consistent with its business purposes and the reason the information was collected.
              Unless a longer retention period is required or permitted by law, CalendarProgrammer
              will retain your personal information only for the length of time needed to fulfill
              the purposes outlined in this Privacy Policy.
            </p>
            <p className="muted">
              When the applicable data retention period expires for a given type of data,
              CalendarProgrammer will delete, anonymize, or securely destroy the information in
              accordance with its data deletion procedures.
            </p>
            <p className="muted">
              You may request deletion of your personal information or Google user data by contacting
              us at cristisimion84@yahoo.co.uk.
            </p>
            <p className="muted">
              After receiving a deletion request, CalendarProgrammer will take reasonable steps to
              verify the request and delete the applicable information, unless retention is required
              or permitted by law, such as for security, fraud prevention, legal compliance, dispute
              resolution, accounting, or other legal obligations.
            </p>
            <p className="muted">
              Where CalendarProgrammer performs actions on your behalf using Google services, it
              retains related data only as needed to provide those features, maintain service
              functionality, keep necessary records, or comply with applicable law. Once the data is
              no longer needed for these purposes, it will be deleted, anonymized, or securely destroyed.
            </p>
          </section>

          <section>
            <h2 className="section-title">Data Sharing</h2>
            <p className="muted">
              Booking information is visible to authorized users in the same workspace according to
              their role and permissions. Calendar data is sent to Google Calendar only when the user
              enables Google Calendar sync. CalendarProgrammer does not sell personal information or
              Google user data.
            </p>
            <p className="muted">
              CalendarProgrammer may share personal information only in limited circumstances, such as
              with service providers who help operate the application, when required by law or legal
              process, to protect rights, users, or services, or with your consent or at your direction.
            </p>
          </section>

          <section>
            <h2 className="section-title">Third-Party Services</h2>
            <p className="muted">
              CalendarProgrammer may integrate with third-party platforms, including Google services.
              Your use of those services may also be governed by the privacy policies and terms of
              those third parties.
            </p>
          </section>

          <section>
            <h2 className="section-title">Your Rights and Choices</h2>
            <p className="muted">
              Depending on your location, you may have rights to access, correct, update, export, or
              delete your personal information. You may also revoke access granted to CalendarProgrammer
              through your Google account settings.
            </p>
            <p className="muted">
              Users can disable Google Calendar sync from their profile. Disabling sync stops future
              synchronization. Existing Google Calendar events created earlier may remain unless they
              are cancelled or removed by the user.
            </p>
            <p className="muted">
              To exercise privacy rights or request deletion of your data, contact us at
              cristisimion84@yahoo.co.uk.
            </p>
          </section>

          <section>
            <h2 className="section-title">Security</h2>
            <p className="muted">
              CalendarProgrammer uses reasonable technical, administrative, and organizational safeguards
              designed to protect personal information. Application data is stored in the configured
              database and authentication is handled using Supabase Auth. Access to server-side database
              credentials and OAuth secrets should be restricted to server environments such as deployment
              environment variables.
            </p>
            <p className="muted">
              However, no method of transmission over the internet or electronic storage is completely
              secure, and CalendarProgrammer cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="section-title">Changes to This Privacy Policy</h2>
            <p className="muted">
              CalendarProgrammer may update this Privacy Policy from time to time. If material changes
              are made, the last updated date above will be changed and, where appropriate, users will
              be notified through the application or other reasonable means.
            </p>
          </section>

          <section>
            <h2 className="section-title">Contact Us</h2>
            <p className="muted">
              For questions about this Privacy Policy or requests related to your personal information,
              contact CalendarProgrammer at cristisimion84@yahoo.co.uk.
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
