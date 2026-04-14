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
    <div>
      <h1>Invitations</h1>

      <h2>Invite a user</h2>

      <form action={createInvitation}>
        <input
          name="email"
          placeholder="Email"
          required
        />

        <select name="role" defaultValue="member">
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>

        <label>
          <input type="checkbox" name="isPermanent" /> Permanent
        </label>

        <button type="submit">Send invite</button>
      </form>

      <hr />

      <h2>Pending invitations</h2>

      <ul>
        {invitations.map((inv) => (
          <li key={inv.id}>
            {inv.email} — {inv.role} —{' '}
            {inv.acceptedAt ? 'Accepted' : 'Pending'}
          </li>
        ))}
      </ul>
    </div>
  )
}
