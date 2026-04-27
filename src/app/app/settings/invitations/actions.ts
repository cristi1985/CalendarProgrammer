'use server'

import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendInvitationEmail } from '@/lib/email'
import type { ActionState } from '@/lib/action-state'
import { getErrorMessage, isRedirectError } from '@/lib/action-state'

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
    throw new Error('Please enter a valid email address.')
  }

  if (role !== 'owner' && role !== 'admin' && role !== 'member') {
    throw new Error('Please select a valid role.')
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
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

export async function createInvitationAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await createInvitation(formData)

    return {
      ok: true,
      message: 'Invitation sent successfully.',
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }

    return {
      ok: false,
      message: getErrorMessage(error),
    }
  }
}
