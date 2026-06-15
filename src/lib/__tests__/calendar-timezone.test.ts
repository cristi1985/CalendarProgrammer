import { describe, expect, it } from 'vitest'
import {
  formatDateForDisplay,
  formatDateForInput,
  formatTimeForCalendar,
  getCalendarRange,
  getDayBounds,
  getMinutesSinceMidnight,
  isSameCalendarDay,
  zonedDateTimeToDate,
} from '../calendar'

const TIME_ZONE = 'Europe/Bucharest'

describe('calendar timezone helpers', () => {
  it('converts a winter local time to the correct UTC instant', () => {
    expect(
      zonedDateTimeToDate('2026-01-15', '10:30', TIME_ZONE).toISOString()
    ).toBe('2026-01-15T08:30:00.000Z')
  })

  it('converts a summer local time using daylight saving time', () => {
    expect(
      zonedDateTimeToDate('2026-06-15', '10:30', TIME_ZONE).toISOString()
    ).toBe('2026-06-15T07:30:00.000Z')
  })

  it('formats dates using the supplied timezone instead of the runtime timezone', () => {
    const date = new Date('2026-06-14T22:30:00.000Z')

    expect(formatDateForInput(date, TIME_ZONE)).toBe('2026-06-15')
    expect(formatDateForDisplay(date, TIME_ZONE)).toBe('15-06-2026')
  })

  it('treats two instants as the same Bucharest calendar day', () => {
    const first = new Date('2026-06-14T22:30:00.000Z')
    const second = new Date('2026-06-15T20:30:00.000Z')

    expect(isSameCalendarDay(first, second, TIME_ZONE)).toBe(true)
    expect(
      isSameCalendarDay(first, new Date('2026-06-15T22:30:00.000Z'), TIME_ZONE)
    ).toBe(false)
  })

  it('returns a 23-hour day across the spring DST transition', () => {
    const date = new Date('2026-03-29T10:00:00.000Z')
    const { start, end } = getDayBounds(date, TIME_ZONE)

    expect(start.toISOString()).toBe('2026-03-28T22:00:00.000Z')
    expect(end.toISOString()).toBe('2026-03-29T20:59:59.999Z')
    expect(end.getTime() - start.getTime() + 1).toBe(23 * 60 * 60 * 1000)
  })

  it('dispatches day ranges through getCalendarRange', () => {
    const date = new Date('2026-06-15T10:00:00.000Z')

    expect(getCalendarRange('day', date, TIME_ZONE)).toEqual(
      getDayBounds(date, TIME_ZONE)
    )
  })

  it('formats time and calculates minutes in the supplied timezone', () => {
    const date = new Date('2026-06-15T07:30:00.000Z')

    expect(formatTimeForCalendar(date, TIME_ZONE)).toMatch(/10:30/)
    expect(getMinutesSinceMidnight(date, TIME_ZONE)).toBe(10 * 60 + 30)
  })

  it('rejects invalid date-time input', () => {
    expect(() =>
      zonedDateTimeToDate('invalid-date', '10:00', TIME_ZONE)
    ).toThrow('Invalid date or time provided.')
  })
})
