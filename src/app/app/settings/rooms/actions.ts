'use server'

import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createRoom(formData: FormData) {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  if (!['owner', 'admin'].includes(result.tenantUser.role)) {
    throw new Error('You are not allowed to create rooms in this workspace.')
  }

  const rawName = formData.get('name')

  if (typeof rawName !== 'string' || rawName.trim().length < 2) {
    throw new Error('Room name must be at least 2 characters long.')
  }

  await db.room.create({
    data: {
      tenantId: result.tenantUser.tenantId,
      name: rawName.trim(),
    },
  })

  revalidatePath('/app/settings/rooms')
}
