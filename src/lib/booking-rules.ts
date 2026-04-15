export const OPEN_HOUR = 8
export const CLOSE_HOUR = 21
export const MAX_RECURRENCE_DAYS = 14
export const CANCEL_NOTICE_HOURS = 24

export function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function validateWorkingHours(startAt: Date, endAt: Date) {
  const startMinutes = startAt.getHours() * 60 + startAt.getMinutes()
  const endMinutes = endAt.getHours() * 60 + endAt.getMinutes()

  const min = OPEN_HOUR * 60
  const max = CLOSE_HOUR * 60

  if (startMinutes < min || endMinutes > max) {
    throw new Error('Outside working hours')
  }
}

export function validateTimeOrder(startAt: Date, endAt: Date) {
  if (startAt >= endAt) {
    throw new Error('Start must be before end')
  }
}

export function validateDailyBooking(startAt: Date, endAt: Date) {
  if (!isSameCalendarDay(startAt, endAt)) {
    throw new Error('Daily booking must be same day')
  }
}

export function canCancel({
  startAt,
  now,
  isPermanent,
  role,
}: {
  startAt: Date
  now: Date
  isPermanent: boolean
  role: string
}) {
  if (isPermanent || role === 'admin' || role === 'owner') {
    return true
  }

  const diffMs = startAt.getTime() - now.getTime()
  return diffMs > CANCEL_NOTICE_HOURS * 60 * 60 * 1000
}

export function generateOccurrences({
  startAt,
  endAt,
  recurrence,
  until,
}: {
  startAt: Date
  endAt: Date
  recurrence: 'none' | 'daily' | 'weekly'
  until?: Date
}) {
  const result = [{ startAt, endAt }]

  if (recurrence === 'none') return result

  if (!until) throw new Error('Missing recurrence end')

  const maxDate = new Date(startAt)
  maxDate.setDate(maxDate.getDate() + MAX_RECURRENCE_DAYS)

  if (until > maxDate) {
    throw new Error('Recurrence too long')
  }

  const step = recurrence === 'daily' ? 1 : 7

  let offset = step

  while (true) {
    const nextStart = new Date(startAt)
    const nextEnd = new Date(endAt)

    nextStart.setDate(nextStart.getDate() + offset)
    nextEnd.setDate(nextEnd.getDate() + offset)

    if (nextStart > until) break

    result.push({ startAt: nextStart, endAt: nextEnd })

    offset += step
  }

  return result
}
