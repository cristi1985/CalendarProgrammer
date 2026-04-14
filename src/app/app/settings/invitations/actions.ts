'use server'

import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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

  await db.invitation.create({
    data: {
      tenantId: result.tenantUser.tenantId,
      email: email.trim().toLowerCase(),
      role,
      isPermanent,
    },
  })

  revalidatePath('/app/settings/invitations')
}
