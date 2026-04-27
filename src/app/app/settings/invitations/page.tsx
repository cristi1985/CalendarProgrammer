import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { InvitationForms } from './InvitationForms'

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

      <InvitationForms invitations={invitations} />
    </div>
  )
}
