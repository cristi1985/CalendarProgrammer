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

  it('creates a valid single booking', async () => {
    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'none')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '10:00')
    formData.set('endTime', '11:00')

    await createBooking(formData)

    expect(dbMock.booking.createMany).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/bookings')
  })

  it('rejects overlapping bookings', async () => {
    dbMock.booking.findFirst.mockResolvedValue({
      id: 'existing-booking',
      roomId: 'room-1',
      tenantId: 'tenant-1',
    })

    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'none')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '10:00')
    formData.set('endTime', '11:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Booking overlaps an existing reservation.'
    )
  })

  it('rejects recurrence beyond 14 days', async () => {
    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'daily')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '10:00')
    formData.set('endTime', '11:00')
    formData.set('recurrenceUntil', '2025-01-20')

    await expect(createBooking(formData)).rejects.toThrow(
      'Recurring bookings can only be created up to 14 days in advance.'
    )
  })

  it('creates recurring daily bookings within 14 days', async () => {
    dbMock.booking.createMany.mockResolvedValue({ count: 3 })

    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'daily')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '10:00')
    formData.set('endTime', '11:00')
    formData.set('recurrenceUntil', '2025-01-03')

    await createBooking(formData)

    expect(dbMock.booking.createMany).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/bookings')
  })

  it('rejects bookings not aligned to hour or half hour', async () => {
    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'none')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '10:15')
    formData.set('endTime', '11:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Bookings must start and end on the hour or half hour.'
    )
  })

  it('rejects missing date/start/end fields', async () => {
    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'none')

    await expect(createBooking(formData)).rejects.toThrow(
      'Date, start time, and end time are required.'
    )
  })

  it('rejects invalid booking type', async () => {
    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'weird-type')
    formData.set('recurrence', 'none')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '10:00')
    formData.set('endTime', '11:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Booking type is invalid.'
    )
  })

  it('rejects invalid recurrence type', async () => {
    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'monthly')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '10:00')
    formData.set('endTime', '11:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Recurrence type is invalid.'
    )
  })

  it('rejects missing recurrence end date for recurring bookings', async () => {
    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'daily')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '10:00')
    formData.set('endTime', '11:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Recurrence end date is required for recurring bookings.'
    )
  })

  it('rejects booking outside working hours', async () => {
    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'none')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '07:00')
    formData.set('endTime', '08:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Bookings must be within working hours 08:00-21:00.'
    )
  })

  it('rejects invalid time order', async () => {
    const formData = new FormData()
    formData.set('roomId', 'room-1')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'none')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '11:00')
    formData.set('endTime', '10:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Booking start time must be before end time.'
    )
  })

  it('rejects room outside tenant workspace', async () => {
    dbMock.room.findFirst.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('roomId', 'room-x')
    formData.set('type', 'hourly')
    formData.set('recurrence', 'none')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '10:00')
    formData.set('endTime', '11:00')

    await expect(createBooking(formData)).rejects.toThrow(
      'Selected room does not exist in this workspace.'
    )
  })
})