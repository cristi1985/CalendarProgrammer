import { describe, it, expect } from 'vitest'
import {
  validateWorkingHours,
  validateTimeOrder,
  validateDailyBooking,
  canCancel,
  generateOccurrences,
} from '../booking-rules'

describe('booking rules', () => {
  it('rejects invalid time order', () => {
    const start = new Date('2025-01-01T10:00')
    const end = new Date('2025-01-01T09:00')

    expect(() => validateTimeOrder(start, end)).toThrow()
  })

  it('rejects outside working hours', () => {
    const start = new Date('2025-01-01T07:00')
    const end = new Date('2025-01-01T09:00')

    expect(() => validateWorkingHours(start, end)).toThrow()
  })

  it('accepts valid working hours', () => {
    const start = new Date('2025-01-01T10:00')
    const end = new Date('2025-01-01T12:00')

    expect(() => validateWorkingHours(start, end)).not.toThrow()
  })

  it('rejects daily booking across multiple days', () => {
    const start = new Date('2025-01-01T10:00')
    const end = new Date('2025-01-02T10:00')

    expect(() => validateDailyBooking(start, end)).toThrow()
  })

  it('allows cancel for permanent user', () => {
    const future = new Date(Date.now() + 1000)

    expect(
      canCancel({
        startAt: future,
        now: new Date(),
        isPermanent: true,
        role: 'member',
      })
    ).toBe(true)
  })

  it('blocks cancel within 24h for regular user', () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000)

    expect(
      canCancel({
        startAt: soon,
        now: new Date(),
        isPermanent: false,
        role: 'member',
      })
    ).toBe(false)
  })

  it('generates recurrence correctly', () => {
    const start = new Date('2025-01-01T10:00')
    const end = new Date('2025-01-01T11:00')
    const until = new Date('2025-01-05T00:00')

    const result = generateOccurrences({
      startAt: start,
      endAt: end,
      recurrence: 'daily',
      until,
    })

    expect(result.length).toBeGreaterThan(1)
  })
})