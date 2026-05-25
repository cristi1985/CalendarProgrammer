export const CALENDAR_START_HOUR = 8
export const CALENDAR_END_HOUR = 21

export type CalendarView = 'day' | 'week' | 'month'

type DateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function pad(value: number) {
  return value.toString().padStart(2, '0')
}

function getDateTimePartsInTimeZone(date: Date, timeZone: string): DateTimeParts {
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

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  ) as Record<string, number>

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
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

function addDaysToDateString(date: string, days: number, timeZone?: string) {
  if (timeZone) {
    const value = zonedDateTimeToDate(date, '00:00', timeZone)
    value.setDate(value.getDate() + days)
    return formatDateForInput(value, timeZone)
  }
  const[year, month, day] = date.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day))
  value.setUTCDate(value.getUTCDate() + days)

  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`
}

export function zonedDateTimeToDate(date: string, time: string, timeZone: string) {
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

export function buildHourSlots() {
  const slots: string[] = []

  for (let hour = CALENDAR_START_HOUR; hour < CALENDAR_END_HOUR; hour += 1) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
    slots.push(`${hour.toString().padStart(2, '0')}:30`)
  }

  return slots
}

export function formatDateForInput(date: Date, timeZone?: string) {
    if (timeZone) {
    const parts = getDateTimePartsInTimeZone(date, timeZone)
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
  }
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function isSameCalendarDay(a: Date, b: Date, timeZone?: string) {
  if (timeZone) {
    return formatDateForInput(a, timeZone) === formatDateForInput(b, timeZone)
  }
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function getDayBounds(date: Date, timeZone?: string) {
  if (timeZone) {
    const dateString = formatDateForInput(date, timeZone)
    const start = zonedDateTimeToDate(dateString, '00:00', timeZone)
    const nextDayStart = zonedDateTimeToDate( addDaysToDateString(dateString, 1), '00:00', timeZone)
    const end = new Date(nextDayStart.getTime() - 1)

    return { start, end }
  }
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function getWeekBounds(date: Date, timeZone?: string) {
  if (timeZone) {
    const dateString = formatDateForInput(date, timeZone)
    const start = zonedDateTimeToDate(dateString, '00:00', timeZone)
    const end = zonedDateTimeToDate(dateString, '23:59:59', timeZone)
    return { start, end }
  }

  const current = new Date(date)
  const day = current.getDay()
  const distanceFromMonday = day === 0 ? 6 : day - 1

  const start = new Date(current)
  start.setDate(current.getDate() - distanceFromMonday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function getMonthBounds(date: Date, timeZone?: string) {
  if (timeZone) {
    const dateString = formatDateForInput(date, timeZone)
    const start = zonedDateTimeToDate(dateString, '00:00', timeZone)
    const end = zonedDateTimeToDate(dateString, '23:59:59', timeZone)
    return { start, end }
  }
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function getCalendarRange(view: CalendarView, date: Date, timeZone?: string) {
  if (view === 'day') return getDayBounds(date, timeZone)
  if (view === 'week') return getWeekBounds(date, timeZone)
  return getMonthBounds(date, timeZone)
}

export function buildWeekDates(date: Date) {
  const { start } = getWeekBounds(date)
  const dates: Date[] = []

  for (let i = 0; i < 7; i += 1) {
    const next = new Date(start)
    next.setDate(start.getDate() + i)
    dates.push(next)
  }

  return dates
}

export function buildMonthDates(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const dates: Date[] = []

  for (let day = 1; day <= end.getDate(); day += 1) {
    dates.push(new Date(date.getFullYear(), date.getMonth(), day))
  }

  return dates
}


export function formatTimeForCalendar(date: Date, timeZone: string) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
}

export function getMinutesSinceMidnight(date: Date, timeZone: string) {
  const parts = getDateTimePartsInTimeZone(date, timeZone)
  return parts.hour * 60 + parts.minute
}