import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  redirectMock,
  revalidatePathMock,
  syncAuthenticatedUserMock,
  createGoogleCalendarEventForBookingMock,
  dbMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  syncAuthenticatedUserMock: vi.fn(),
  createGoogleCalendarEventForBookingMock: vi.fn(),
  dbMock: {
    room: {
      findFirst: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}))

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))

vi.mock('@/lib/auth', () => ({
  syncAuthenticatedUser: (...args: unknown[]) =>
    syncAuthenticatedUserMock(...args),
}))

vi.mock('@/lib/db', () => ({
  db: dbMock,
}))

vi.mock('@/lib/google-calendar', () => ({
  createGoogleCalendarEventForBooking: (...args: unknown[]) =>
    createGoogleCalendarEventForBookingMock(...args),
}))

import { createBooking } from '../actions'

function createFormData(overrides: Record<string, string> = {}) {
  const values = {
    roomId: 'room-1',
    type: 'hourly',
    recurrence: 'none',
    date: '2025-01-01',
    startTime: '10:00',
    endTime: '11:00',
    clientName: 'Test Client',
    ...overrides,
  }

  const formData = new FormData()
  Object.entries(values).forEach(([key, value]) => formData.set(key, value))
  return formData
}

describe('createBooking edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: {
        tenantId: 'tenant-1',
        role: 'member',
        isPermanent: true,
        tenant: { timezone: 'Europe/Bucharest' },
      },
    })

    dbMock.room.findFirst.mockResolvedValue({
      id: 'room-1',
      tenantId: 'tenant-1',
      name: 'Room 1',
    })
    dbMock.booking.findFirst.mockResolvedValue(null)
    dbMock.booking.create.mockResolvedValue({
      id: 'booking-1',
      tenant: { timezone: 'Europe/Bucharest' },
    })
    createGoogleCalendarEventForBookingMock.mockResolvedValue(undefined)
  })

  it('rejects bookings outside working hours', async () => {
    await expect(
      createBooking(
        createFormData({ startTime: '07:00', endTime: '09:00' })
      )
    ).rejects.toThrow(
      'Bookings must be within working hours 08:00-21:00.'
    )
  })

  it('rejects invalid time order', async () => {
    await expect(
      createBooking(
        createFormData({ startTime: '11:00', endTime: '10:00' })
      )
    ).rejects.toThrow('Booking start time must be before end time.')
  })

  it('rejects a room outside the current tenant', async () => {
    dbMock.room.findFirst.mockResolvedValue(null)

    await expect(
      createBooking(createFormData({ roomId: 'room-999' }))
    ).rejects.toThrow('Selected room does not exist in this workspace.')
  })
})
