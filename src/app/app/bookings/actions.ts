'use server'

import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const OPEN_HOUR = 8
const CLOSE_HOUR = 21
const MAX_RECURRENCE_DAYS = 14

type BookingType = 'hourly' | 'daily'
type RecurrenceType = 'none' | 'daily' | 'weekly'

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

function isSameCalendarDay(startAt: Date, endAt: Date) {
  return (
    startAt.getFullYear() === endAt.getFullYear() &&
    startAt.getMonth() === endAt.getMonth() &&
    startAt.getDate() === endAt.getDate()
  )
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function generateOccurrences(
  startAt: Date,
  endAt: Date,
  recurrence: RecurrenceType,
  recurrenceUntil: Date | null
) {
  const occurrences = [{ startAt, endAt }]

  if (recurrence === 'none') {
    return occurrences
  }

  if (!recurrenceUntil) {
    throw new Error('Recurrence end date is required for recurring bookings.')
  }

  const maxUntil = addDays(startAt, MAX_RECURRENCE_DAYS)
  if (recurrenceUntil > maxUntil) {
    throw new Error('Recurring bookings can only be created up to 14 days in advance.')
  }

  const intervalDays = recurrence === 'daily' ? 1 : 7
  let offset = intervalDays

  while (true) {
    const nextStart = addDays(startAt, offset)
    const nextEnd = addDays(endAt, offset)

    if (nextStart > recurrenceUntil) {
      break
    }

    occurrences.push({ startAt: nextStart, endAt: nextEnd })
    offset += intervalDays
  }

  return occurrences
}

async function ensureNoOverlap(tenantId: string, roomId: string, startAt: Date, endAt: Date) {
  const conflict = await db.booking.findFirst({
    where: {
      tenantId,
      roomId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  })

  if (conflict) {
    throw new Error('Booking overlaps an existing reservation.')
  }
}

export async function createBooking(formData: FormData) {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  const roomId = formData.get('roomId')
  const type = formData.get('type') as BookingType
  const recurrence = formData.get('recurrence') as RecurrenceType
  const startAt = parseDateTime(formData.get('startAt'))
  const endAt = parseDateTime(formData.get('endAt'))
  const recurrenceUntilValue = formData.get('recurrenceUntil')
  const recurrenceUntil =
    typeof recurrenceUntilValue === 'string' && recurrenceUntilValue
      ? new Date(recurrenceUntilValue)
      : null

  if (typeof roomId !== 'string' || !roomId) {
    throw new Error('Room is required.')
  }

  if (type !== 'hourly' && type !== 'daily') {
    throw new Error('Booking type is invalid.')
  }

  if (recurrence !== 'none' && recurrence !== 'daily' && recurrence !== 'weekly') {
    throw new Error('Recurrence type is invalid.')
  }

  if (startAt >= endAt) {
    throw new Error('Booking start time must be before end time.')
  }

  validateWithinWorkingHours(startAt, endAt)

  if (type === 'daily' && !isSameCalendarDay(startAt, endAt)) {
    throw new Error('Daily bookings must start and end on the same calendar day.')
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

  const occurrences = generateOccurrences(startAt, endAt, recurrence, recurrenceUntil)

  for (const occurrence of occurrences) {
    validateWithinWorkingHours(occurrence.startAt, occurrence.endAt)

    if (type === 'daily' && !isSameCalendarDay(occurrence.startAt, occurrence.endAt)) {
      throw new Error('Daily bookings must remain inside one calendar day.')
    }

    await ensureNoOverlap(
      result.tenantUser.tenantId,
      roomId,
      occurrence.startAt,
      occurrence.endAt
    )
  }

  await db.booking.createMany({
    data: occurrences.map((occurrence) => ({
      tenantId: result.tenantUser!.tenantId,
      roomId,
      userId: result.user.id,
      startAt: occurrence.startAt,
      endAt: occurrence.endAt,
      type,
    })),
  })

  revalidatePath('/app/bookings')
}
