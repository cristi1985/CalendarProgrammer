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

describe('createBooking action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a valid single booking', async () => {
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

    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'none')
    formData.set('startAt', '2025-01-01T10:00')
    formData.set('endAt', '2025-01-01T11:00')

    await createBooking(formData)

    expect(dbMock.booking.createMany).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/bookings')
  })

  it('rejects overlapping bookings', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    dbMock.room.findFirst.mockResolvedValue({
      id: 'room-1',
      tenantId: 'tenant-1',
      name: 'Room 1',
    })

    dbMock.booking.findFirst.mockResolvedValue({
      id: 'existing-booking',
      roomId: 'room-1',
      tenantId: 'tenant-1',
    })

    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'none')
    formData.set('startAt', '2025-01-01T10:00')
    formData.set('endAt', '2025-01-01T11:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Booking overlaps an existing reservation.'
    )
  })

  it('rejects recurrence beyond 14 days', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    dbMock.room.findFirst.mockResolvedValue({
      id: 'room-1',
      tenantId: 'tenant-1',
      name: 'Room 1',
    })

    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'daily')
    formData.set('startAt', '2025-01-01T10:00')
    formData.set('endAt', '2025-01-01T11:00')
    formData.set('recurrenceUntil', '2025-01-20')

    await expect(createBooking(formData)).rejects.toThrow(
      'Recurring bookings can only be created up to 14 days in advance.'
    )
  })

  it('creates recurring daily bookings within 14 days', async () => {
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
    dbMock.booking.createMany.mockResolvedValue({ count: 3 })

    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'daily')
    formData.set('startAt', '2025-01-01T10:00')
    formData.set('endAt', '2025-01-01T11:00')
    formData.set('recurrenceUntil', '2025-01-03')

    await createBooking(formData)

    expect(dbMock.booking.createMany).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/bookings')
  })
})
