import { describe, expect, it } from 'vitest'
import {
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  buildHourSlots,
  formatDateForInput,
} from '../calendar'

describe('calendar helpers', () => {
  it('builds hour slots from start to end hour', () => {
    const slots = buildHourSlots()

    expect(slots[0]).toBe('08:00')
    expect(slots[slots.length - 1]).toBe('20:00')
    expect(slots.length).toBe(CALENDAR_END_HOUR - CALENDAR_START_HOUR)
  })

  it('formats date for input fields', () => {
    const date = new Date('2025-01-09T14:30:00')

    expect(formatDateForInput(date)).toBe('2025-01-09')
  })

  it('returns zero-padded month and day values', () => {
    const date = new Date('2025-02-03T09:15:00')

    expect(formatDateForInput(date)).toBe('2025-02-03')
  })
})
