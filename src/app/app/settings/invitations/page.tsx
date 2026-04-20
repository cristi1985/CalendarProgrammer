import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createInvitation } from './actions'

export default async function InvitationsPage() {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  const invitations = await db.invitation.findMany({
    where: {
      tenantId: result.tenantUser.tenantId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Invitations</h1>
      </div>

      <section className="stack">
        <h2 className="section-title">Invite a user</h2>

        <form action={createInvitation} className="stack">
          <div className="form-grid">
            <input
              className="input"
              name="email"
              placeholder="Email address"
              required
            />

            <select className="select" name="role" defaultValue="member">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          <label className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input style={{ width: 'auto', minHeight: 'auto' }} type="checkbox" name="isPermanent" />
            Permanent user
          </label>

          <div>
            <button className="button" type="submit">
              Send invite
            </button>
          </div>
        </form>
      </section>

      <section className="stack">
        <h2 className="section-title">Pending invitations</h2>

        <div className="card-list">
          {invitations.map((inv) => (
            <div key={inv.id} className="card-item">
              <div>
                <strong>{inv.email}</strong>
              </div>
              <div className="muted">
                Role: {inv.role}
              </div>
              <div className="muted">
                Status: {inv.acceptedAt ? 'Accepted' : 'Pending'}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
