'use server'

import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { ActionState } from '@/lib/action-state'
import { getErrorMessage, isRedirectError } from '@/lib/action-state'
import { createGoogleCalendarEventForBooking } from '@/lib/google-calendar'
import { get } from 'http'

const OPEN_HOUR = 8
const CLOSE_HOUR = 21
const MAX_RECURRENCE_DAYS = 14


type BookingType = 'hourly' | 'daily'
type RecurrenceType = 'none' | 'daily' | 'weekly'

function validateHalfHourStep(startAt: Date, endAt: Date, timeZone: string) {
  const start = getDateTimePartsInTimeZone(startAt, timeZone)
  const end = getDateTimePartsInTimeZone(endAt, timeZone)

  if (![0, 30].includes(start.minute) || ![0, 30].includes(end.minute)) {
    throw new Error('Bookings must start and end on the hour or half hour.')
  }
}

function getMinutesSinceMidnight(date: Date, timeZone: string) {
  const parts = getDateTimePartsInTimeZone(date, timeZone)
  return parts.hour * 60 + parts.minute
}


function validateWithinWorkingHours(startAt: Date, endAt: Date, timeZone: string) {
  const startMinutes = getMinutesSinceMidnight(startAt, timeZone)
  const endMinutes = getMinutesSinceMidnight(endAt, timeZone)
  const minMinutes = OPEN_HOUR * 60
  const maxMinutes = CLOSE_HOUR * 60

  if (startMinutes < minMinutes || endMinutes > maxMinutes) {
    throw new Error('Bookings must be within working hours 08:00-21:00.')
  }
}

function isSameCalendarDay(a: Date, b: Date, timeZone: string) {
  const first = getDateTimePartsInTimeZone(a, timeZone)
  const second = getDateTimePartsInTimeZone(b, timeZone)

  return (
    first.year === second.year &&
    first.month === second.month &&
    first.day === second.day
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

function getDateTimePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  ) as Record<string, number>
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getDateTimePartsInTimeZone(date, timeZone)

  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )

  return asUtc - date.getTime()
}

function combineDateAndTime(date: string, time: string, timeZone: string) {
  const normalizedTime = time.length === 5 ? `${time}:00` : time
  const utcGuess = new Date(`${date}T${normalizedTime}.000Z`)

  if (Number.isNaN(utcGuess.getTime())) {
    throw new Error('Invalid date or time provided.')
  }

  const offset = getTimeZoneOffsetMs(utcGuess, timeZone)
  let value = new Date(utcGuess.getTime() - offset)

  const correctedOffset = getTimeZoneOffsetMs(value, timeZone)
  if (correctedOffset !== offset) {
    value = new Date(utcGuess.getTime() - correctedOffset)
  }

  return value

}

export async function createBookingAction (_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createBooking(formData)
    return { ok: true, message: 'Booking created successfully.' }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }
    return { ok: false, message: getErrorMessage(error) }
  }
}

export async function createBooking(formData: FormData) {
  const result = await syncAuthenticatedUser()
  
  const timeZone = result?.tenantUser?.tenant.timezone || 'Europe/Bucharest'

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  const roomId = formData.get('roomId')
  const type = formData.get('type') as BookingType
  const recurrence = formData.get('recurrence') as RecurrenceType
  const dateValue = formData.get('date')
  const startTimeValue = formData.get('startTime')
  const endTimeValue = formData.get('endTime')
  const clientNameValue = formData.get('clientName') as string | null

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

  if(typeof dateValue !== 'string' || typeof startTimeValue !== 'string' || typeof endTimeValue !== 'string') {
    throw new Error('Date, start time, and end time are required.')
  }

  if (startTimeValue >= endTimeValue) {
    throw new Error('Booking start time must be before end time.')
  }

  if (typeof clientNameValue !== 'string' || clientNameValue.trim().length < 2) {
  throw new Error('Client name must be at least 2 characters long.')
}

  const clientName = clientNameValue.trim()

  const startAt = combineDateAndTime(dateValue, startTimeValue, timeZone)
  const endAt = combineDateAndTime(dateValue, endTimeValue, timeZone)

  validateHalfHourStep(startAt, endAt, timeZone);
  validateWithinWorkingHours(startAt, endAt, timeZone)

  if (type === 'daily' && !isSameCalendarDay(startAt, endAt, timeZone)) {
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
    validateWithinWorkingHours(occurrence.startAt, occurrence.endAt, timeZone)

    if (type === 'daily' && !isSameCalendarDay(occurrence.startAt, occurrence.endAt, timeZone)) {
      throw new Error('Daily bookings must remain inside one calendar day.')
    }

    await ensureNoOverlap(
      result.tenantUser.tenantId,
      roomId,
      occurrence.startAt,
      occurrence.endAt
    )
  }

  for(const occurrence of occurrences) {
    const booking = await db.booking.create({
      data: {
        tenantId: result.tenantUser.tenantId,
        userId: result.user.id,
        roomId,
        clientName,
        startAt: occurrence.startAt,
        endAt: occurrence.endAt,
        type
      },
      include:{
        room: true,
        user: true,
        tenant :{
          select:{
            timezone: true,
          }
        }
      }
    })
    try{
      await createGoogleCalendarEventForBooking(booking)
    } catch (error) {
      console.error('Error creating Google Calendar event:', error)
    }
  }
  revalidatePath('/app/bookings')
}
