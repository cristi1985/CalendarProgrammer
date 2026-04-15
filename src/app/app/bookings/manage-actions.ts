'use server'

import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const OPEN_HOUR = 8
const CLOSE_HOUR = 21
const REGULAR_USER_CANCEL_NOTICE_HOURS = 24

function parseDateTime(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value) {
    throw new Error('Date and time are required.')
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date provided.')
  }

  return date
}

function validateWithinWorkingHours(startAt: Date, endAt: Date) {
  const startMinutes = startAt.getHours() * 60 + startAt.getMinutes()
  const endMinutes = endAt.getHours() * 60 + endAt.getMinutes()
  const minMinutes = OPEN_HOUR * 60
  const maxMinutes = CLOSE_HOUR * 60

  if (startMinutes < minMinutes || endMinutes > maxMinutes) {
    throw new Error('Bookings must be within working hours 08:00-21:00.')
  }
}

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

async function getManagedBooking(bookingId: string, tenantId: string) {
  return db.booking.findFirst({
    where: {
      id: bookingId,
      tenantId,
    },
  })
}

async function ensureNoOverlapExcludingBooking(
  tenantId: string,
  roomId: string,
  startAt: Date,
  endAt: Date,
  bookingId: string
) {
  const conflict = await db.booking.findFirst({
    where: {
      tenantId,
      roomId,
      id: { not: bookingId },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  })

  if (conflict) {
    throw new Error('Booking overlaps an existing reservation.')
  }
}

function canCancelWithoutNotice(isPermanent: boolean, role: string) {
  return isPermanent || role === 'owner' || role === 'admin'
}

export async function cancelBooking(formData: FormData) {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  const bookingId = formData.get('bookingId')

  if (typeof bookingId !== 'string' || !bookingId) {
    throw new Error('Booking id is required.')
  }

  const booking = await getManagedBooking(bookingId, result.tenantUser.tenantId)

  if (!booking) {
    throw new Error('Booking not found.')
  }

  const isPrivileged = ['owner', 'admin'].includes(result.tenantUser.role)
  const isOwnerOfBooking = booking.userId === result.user.id

  if (!isPrivileged && !isOwnerOfBooking) {
    throw new Error('You are not allowed to cancel this booking.')
  }

  if (!canCancelWithoutNotice(result.tenantUser.isPermanent, result.tenantUser.role)) {
    const noticeWindowMs = REGULAR_USER_CANCEL_NOTICE_HOURS * 60 * 60 * 1000
    const diff = booking.startAt.getTime() - Date.now()

    if (diff <= noticeWindowMs) {
      throw new Error('Bookings can only be cancelled more than 24 hours in advance.')
    }
  }

  await db.booking.delete({
    where: {
      id: booking.id,
    },
  })

  revalidatePath('/app/bookings')
}

export async function updateBooking(formData: FormData) {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  const bookingId = formData.get('bookingId')
  const roomId = formData.get('roomId')
  const startAt = parseDateTime(formData.get('startAt'))
  const endAt = parseDateTime(formData.get('endAt'))

  if (typeof bookingId !== 'string' || !bookingId) {
    throw new Error('Booking id is required.')
  }

  if (typeof roomId !== 'string' || !roomId) {
    throw new Error('Room id is required.')
  }

  if (startAt >= endAt) {
    throw new Error('Booking start time must be before end time.')
  }

  validateWithinWorkingHours(startAt, endAt)

  const booking = await getManagedBooking(bookingId, result.tenantUser.tenantId)

  if (!booking) {
    throw new Error('Booking not found.')
  }

  const isPrivileged = ['owner', 'admin'].includes(result.tenantUser.role)
  const isOwnerOfBooking = booking.userId === result.user.id

  if (!isPrivileged && !isOwnerOfBooking) {
    throw new Error('You are not allowed to modify this booking.')
  }

  if (!isSameCalendarDay(booking.startAt, startAt) || !isSameCalendarDay(booking.endAt, endAt)) {
    throw new Error('Bookings can only be modified within the same calendar day.')
  }

  if (booking.type === 'daily' && !isSameCalendarDay(startAt, endAt)) {
    throw new Error('Daily bookings must remain inside one calendar day.')
  }

  const room = await db.room.findFirst({
    where: {
      id: roomId,
      tenantId: result.tenantUser.tenantId,
    },
  })

  if (!room) {
    throw new Error('Selected room does not exist in this workspace.')
  }

  await ensureNoOverlapExcludingBooking(
    result.tenantUser.tenantId,
    roomId,
    startAt,
    endAt,
    booking.id
  )

  await db.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      roomId,
      startAt,
      endAt,
    },
  })

  revalidatePath('/app/bookings')
}
