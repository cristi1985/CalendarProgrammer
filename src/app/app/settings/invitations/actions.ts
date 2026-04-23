'use server'

import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendInvitationEmail } from '@/lib/email'

export async function createInvitation(formData: FormData) {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  if (!['owner', 'admin'].includes(result.tenantUser.role)) {
    throw new Error('You are not allowed to invite users to this workspace.')
  }

  const email = formData.get('email')
  const role = formData.get('role')
  const isPermanent = formData.get('isPermanent') === 'on'

  if (typeof email !== 'string' || !email.includes('@')) {
    throw new Error('A valid email is required.')
  }

  if (role !== 'owner' && role !== 'admin' && role !== 'member') {
    throw new Error('A valid role is required.')
  }

  const normalizedEmail = email.trim().toLowerCase()

  await db.invitation.create({
    data: {
      tenantId: result.tenantUser.tenantId,
      email: normalizedEmail,
      role,
      isPermanent,
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const inviteUrl = `${appUrl}/signup?email=${encodeURIComponent(normalizedEmail)}`

  await sendInvitationEmail({
    to: normalizedEmail,
    workspaceName: result.tenantUser.tenant.name,
    invitedByName: result.user.fullName,
    role,
    isPermanent,
    inviteUrl,
  })

  revalidatePath('/app/settings/invitations')
}
