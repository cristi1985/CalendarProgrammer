export const CALENDAR_START_HOUR = 8
export const CALENDAR_END_HOUR = 21

export type CalendarView = 'day' | 'week' | 'month'

export function buildHourSlots() {
  const slots: string[] = []

  for (let hour = CALENDAR_START_HOUR; hour < CALENDAR_END_HOUR; hour += 1) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
  }

  return slots
}

export function formatDateForInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getDayBounds(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function getWeekBounds(date: Date) {
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

export function getMonthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function getCalendarRange(view: CalendarView, date: Date) {
  if (view === 'day') return getDayBounds(date)
  if (view === 'week') return getWeekBounds(date)
  return getMonthBounds(date)
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
