'use server'

import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { ActionState } from '@/lib/action-state'
import { getErrorMessage, isRedirectError } from '@/lib/action-state'
import { updateGoogleCalendarEventForBooking } from '@/lib/google-calendar'
import { deleteGoogleCalendarEventForBooking } from '@/lib/google-calendar'
import { zonedDateTimeToDate } from '@/lib/calendar'
const OPEN_HOUR = 8
const CLOSE_HOUR = 21
const REGULAR_USER_CANCEL_NOTICE_HOURS = 24



function validateHalfHourStep(startAt: Date, endAt: Date, timeZone: string) {
  const start = getDateTimePartsInTimeZone(startAt, timeZone)
  const end = getDateTimePartsInTimeZone(endAt, timeZone)

  if (![0, 30].includes(start.minute) || ![0, 30].includes(end.minute)) {
    throw new Error('Bookings must start and end on the hour or half hour.')
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
  return (isPermanent && role === 'member') || role === 'owner' || role === 'admin'
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
  const timeZone = result.tenantUser.tenant.timezone || 'Europe/Bucharest'
  const now = new Date()
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

  if(booking.startAt < now && !isSameCalendarDay(booking.startAt, now, timeZone) && !isPrivileged) {
    throw new Error('Past bookings can only be cancelled on the same calendar day.')
  }

  
  try {
    await deleteGoogleCalendarEventForBooking({
    userId: booking.userId,
    googleEventId: booking.googleEventId})}
  catch (error) {
    console.error('Error deleting Google Calendar event:', error);
  }
  await db.booking.delete({
      where: {
        id: booking.id,
      },
    })
    revalidatePath('/app/bookings')
  }

  

function combineDateAndTime(date: string, time: string, timeZone?: string): Date {
  if(timeZone) {
    const zonedDate = zonedDateTimeToDate(date, time, timeZone)
    return zonedDate
  }
  const value = new Date(`${date}T${time}`)

  if (Number.isNaN(value.getTime())) {
    throw new Error('Invalid date or time provided.')
  }

  return value
}

export async function updateBookingAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try{
    await updateBooking(formData)
    return { ok: true, message: 'Booking updated successfully.', id: Date.now() }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }
    return { ok: false, message: getErrorMessage(error), id: Date.now() }
  }
}

export async function cancelBookingAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await cancelBooking(formData)
    return { ok: true, message: 'Booking cancelled successfully.', id: Date.now() }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }
    return { ok: false, message: getErrorMessage(error), id: Date.now() }
  }
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
  const dateValue = formData.get('date')
  const startTimeValue = formData.get('startTime')
  const endTimeValue = formData.get('endTime')
  const clientNameValue = formData.get('clientName')
  const timeZone = result.tenantUser.tenant.timezone || 'Europe/Bucharest'

  if (typeof bookingId !== 'string' || !bookingId) {
    throw new Error('Booking id is required.')
  }

  if (typeof roomId !== 'string' || !roomId) {
    throw new Error('Room id is required.')
  }

  if (typeof dateValue !== 'string' || typeof startTimeValue !== 'string' || typeof endTimeValue !== 'string') {
    throw new Error('Date, start time, and end time are required.')
  }

  if (typeof clientNameValue !== 'string' || clientNameValue.trim().length < 2) {
  throw new Error('Client name must be at least 2 characters long.')
  }

  const clientName = clientNameValue.trim()

  const startAt = combineDateAndTime(dateValue, startTimeValue, timeZone)
  const endAt = combineDateAndTime(dateValue, endTimeValue, timeZone)

  if (startAt >= endAt) {
    throw new Error('Booking start time must be before end time.')
  }
 
  validateHalfHourStep(startAt, endAt, timeZone);
  validateWithinWorkingHours(startAt, endAt, timeZone)

  const booking = await getManagedBooking(bookingId, result.tenantUser.tenantId)

  if (!booking) {
    throw new Error('Booking not found.')
  }

  const isPrivileged = ['owner', 'admin'].includes(result.tenantUser.role)
  const isOwnerOfBooking = booking.userId === result.user.id

  if (!isPrivileged && !isOwnerOfBooking) {
    throw new Error('You are not allowed to modify this booking.')
  }

  if (!isSameCalendarDay(booking.startAt, startAt, timeZone) || !isSameCalendarDay(booking.endAt, endAt, timeZone)) {
    throw new Error('Bookings can only be modified within the same calendar day.')
  }

  if (booking.type === 'daily' && !isSameCalendarDay(startAt, endAt, timeZone)) {
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

 const updateBooking = await db.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      roomId,
      startAt,
      endAt,
      clientName,
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
  try {
    console.log('Updating Google Calendar event for booking:', updateBooking);
    await updateGoogleCalendarEventForBooking(updateBooking);
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
  }
    revalidatePath('/app/bookings')
}
