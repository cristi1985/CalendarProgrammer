import { describe, expect, it } from 'vitest'
import {
  getCalendarRange,
  buildWeekDates,
  buildMonthDates,
} from '../calendar'

describe('calendar edge cases', () => {
  it('getCalendarRange returns correct day range', () => {
    const date = new Date('2025-01-10T15:00:00')
    const { start, end } = getCalendarRange('day', date)

    expect(start.getHours()).toBe(0)
    expect(end.getHours()).toBe(23)
  })

  it('getCalendarRange returns correct week range', () => {
    const date = new Date('2025-01-08')
    const { start, end } = getCalendarRange('week', date)

    expect(start.getDay()).toBe(1)
    expect(end.getDay()).toBe(0)
  })

  it('getCalendarRange returns correct month range', () => {
    const date = new Date('2025-03-15')
    const { start, end } = getCalendarRange('month', date)

    expect(start.getDate()).toBe(1)
    expect(end.getDate()).toBe(31)
  })

  it('handles leap year February correctly', () => {
    const date = new Date('2024-02-15')
    const days = buildMonthDates(date)

    expect(days.length).toBe(29)
  })

  it('buildWeekDates returns consecutive days', () => {
    const date = new Date('2025-01-08')
    const days = buildWeekDates(date)

    for (let i = 1; i < days.length; i++) {
      const diff = days[i].getDate() - days[i - 1].getDate()
      expect(diff === 1 || diff < 0).toBe(true)
    }
  })
})
