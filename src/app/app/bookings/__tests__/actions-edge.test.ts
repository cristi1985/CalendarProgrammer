import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  redirectMock,
  revalidatePathMock,
  syncAuthenticatedUserMock,
  dbMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  syncAuthenticatedUserMock: vi.fn(),
  dbMock: {
    room: {
      findFirst: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
      createMany: vi.fn(),
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

import { createBooking } from '../actions'

describe('createBooking edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    dbMock.room.findFirst.mockResolvedValue({
      id: 'room-1',
      tenantId: 'tenant-1',
      name: 'Room 1',
    })

    dbMock.booking.findFirst.mockResolvedValue(null)
    dbMock.booking.createMany.mockResolvedValue({ count: 1 })
  })

  it('rejects bookings outside working hours', async () => {
    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'none')
    formData.set('startAt', '2025-01-01T07:00')
    formData.set('endAt', '2025-01-01T09:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Bookings must be within working hours 08:00-21:00.'
    )
  })

  it('rejects invalid time order', async () => {
    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'none')
    formData.set('startAt', '2025-01-01T11:00')
    formData.set('endAt', '2025-01-01T10:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Booking start time must be before end time.'
    )
  })

  it('rejects daily bookings across multiple days', async () => {
    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'daily')
    formData.set('recurrence', 'none')
    formData.set('startAt', '2025-01-01T10:00')
    formData.set('endAt', '2025-01-02T10:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Daily bookings must start and end on the same calendar day.'
    )
  })

  it('rejects a room outside the current tenant', async () => {
    dbMock.room.findFirst.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('roomId', 'room-999')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'none')
    formData.set('startAt', '2025-01-01T10:00')
    formData.set('endAt', '2025-01-01T11:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Selected room does not exist in this workspace.'
    )
  })
})
