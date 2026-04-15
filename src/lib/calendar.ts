export const CALENDAR_START_HOUR = 8
export const CALENDAR_END_HOUR = 21

export function buildHourSlots() {
  const slots: string[] = []

  for (let hour = CALENDAR_START_HOUR; hour < CALENDAR_END_HOUR; hour += 1) {
    const label = `${hour.toString().padStart(2, '0')}:00`
    slots.push(label)
  }

  return slots
}

export function formatDateForInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}