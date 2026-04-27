'use server'

import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { ActionState } from '@/lib/action-state'
import { getErrorMessage, isRedirectError } from '@/lib/action-state'

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

export async function createRoomAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await createRoom(formData)

    return {
      ok: true,
      message: 'Room created successfully.',
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

export async function deleteRoom(formData: FormData) {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  if (!['owner', 'admin'].includes(result.tenantUser.role)) {
    throw new Error('You are not allowed to delete rooms in this workspace.')
  }

  const roomId = formData.get('roomId')

  if (typeof roomId !== 'string') {
    throw new Error('Invalid room ID provided.')
  }

  const room = await db.room.findFirst({
    where: {
      id: roomId,
      tenantId: result.tenantUser.tenantId,
    },
  })

  if (!room) {
    throw new Error('Room not found in this workspace.')
  }

  const bookingCount = await db.booking.count({
    where: {
      tenantId: result.tenantUser.tenantId,
      roomId,
    },
  })

  if (bookingCount > 0) {
    throw new Error('Room cannot be deleted because it already has bookings.')
  }

  await db.room.delete({
    where: {
      id: roomId,
      tenantId: result.tenantUser.tenantId,
    },
  })

  revalidatePath('/app/settings/rooms')
}

export async function deleteRoomAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await deleteRoom(formData)

    return {
      ok: true,
      message: 'Room deleted successfully.',
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
