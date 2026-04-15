import { describe, expect, it } from 'vitest'
import {
  buildHourSlots,
  formatDateForInput,
  getDayBounds,
  getWeekBounds,
  getMonthBounds,
  buildWeekDates,
  buildMonthDates,
} from '../calendar'

describe('calendar helpers', () => {
  it('builds hour slots correctly', () => {
    const slots = buildHourSlots()

    expect(slots[0]).toBe('08:00')
    expect(slots.at(-1)).toBe('20:00')
    expect(slots.length).toBe(13)
  })

  it('formats date correctly', () => {
    const date = new Date('2025-01-09T10:00:00')
    expect(formatDateForInput(date)).toBe('2025-01-09')
  })

  it('returns correct day bounds', () => {
    const date = new Date('2025-01-09T15:00:00')
    const { start, end } = getDayBounds(date)

    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)

    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
  })

  it('returns correct week bounds starting Monday', () => {
    const date = new Date('2025-01-08') // Wednesday
    const { start, end } = getWeekBounds(date)

    expect(start.getDay()).toBe(1) // Monday
    expect(end.getDay()).toBe(0)   // Sunday
  })

  it('returns correct month bounds', () => {
    const date = new Date('2025-02-15')
    const { start, end } = getMonthBounds(date)

    expect(start.getDate()).toBe(1)
    expect(end.getDate()).toBe(28)
  })

  it('builds 7 days for week view', () => {
    const date = new Date('2025-01-08')
    const days = buildWeekDates(date)

    expect(days.length).toBe(7)
    expect(days[0].getDay()).toBe(1) // Monday
  })

  it('builds all days for month view', () => {
    const date = new Date('2025-02-15')
    const days = buildMonthDates(date)

    expect(days.length).toBe(28)
    expect(days[0].getDate()).toBe(1)
    expect(days.at(-1)?.getDate()).toBe(28)
  })
})