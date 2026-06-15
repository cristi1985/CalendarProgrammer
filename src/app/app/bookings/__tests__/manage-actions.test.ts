import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  redirectMock,
  revalidatePathMock,
  syncAuthenticatedUserMock,
  updateGoogleCalendarEventForBookingMock,
  deleteGoogleCalendarEventForBookingMock,
  dbMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  syncAuthenticatedUserMock: vi.fn(),
  updateGoogleCalendarEventForBookingMock: vi.fn(),
  deleteGoogleCalendarEventForBookingMock: vi.fn(),
  dbMock: {
    booking: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    room: {
      findFirst: vi.fn(),
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
  updateGoogleCalendarEventForBooking: (...args: unknown[]) =>
    updateGoogleCalendarEventForBookingMock(...args),
  deleteGoogleCalendarEventForBooking: (...args: unknown[]) =>
    deleteGoogleCalendarEventForBookingMock(...args),
}))

import { cancelBooking, updateBooking } from '../manage-actions'

function authenticatedUser(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user-1' },
    tenantUser: {
      tenantId: 'tenant-1',
      role: 'member',
      isPermanent: false,
      tenant: { timezone: 'Europe/Bucharest' },
      ...overrides,
    },
  }
}

function updateFormData(overrides: Record<string, string> = {}) {
  const values = {
    bookingId: 'booking-1',
    roomId: 'room-1',
    date: '2025-01-01',
    startTime: '12:00',
    endTime: '13:00',
    clientName: 'Updated Client',
    ...overrides,
  }

  const formData = new FormData()
  Object.entries(values).forEach(([key, value]) => formData.set(key, value))
  return formData
}

function managedBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    startAt: new Date('2025-01-01T08:00:00.000Z'),
    endAt: new Date('2025-01-01T09:00:00.000Z'),
    roomId: 'room-1',
    type: 'hourly',
    googleEventId: null,
    ...overrides,
  }
}

describe('booking manage actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    syncAuthenticatedUserMock.mockResolvedValue(authenticatedUser())
    updateGoogleCalendarEventForBookingMock.mockResolvedValue(undefined)
    deleteGoogleCalendarEventForBookingMock.mockResolvedValue(undefined)
  })

  it('rejects cancelling a booking that does not exist', async () => {
    dbMock.booking.findFirst.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('bookingId', 'missing-booking')

    await expect(cancelBooking(formData)).rejects.toThrow('Booking not found.')
  })

  it('rejects cancelling another user booking when not admin or owner', async () => {
    dbMock.booking.findFirst.mockResolvedValue(
      managedBooking({
        userId: 'user-2',
        startAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 49 * 60 * 60 * 1000),
      })
    )

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')

    await expect(cancelBooking(formData)).rejects.toThrow(
      'You are not allowed to cancel this booking.'
    )
  })

  it('blocks regular users from cancelling within 24 hours', async () => {
    dbMock.booking.findFirst.mockResolvedValue(
      managedBooking({
        startAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      })
    )

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')

    await expect(cancelBooking(formData)).rejects.toThrow(
      'Bookings can only be cancelled more than 24 hours in advance.'
    )
  })

  it('allows permanent users to cancel without 24 hour notice', async () => {
    syncAuthenticatedUserMock.mockResolvedValue(
      authenticatedUser({ isPermanent: true })
    )
    dbMock.booking.findFirst.mockResolvedValue(
      managedBooking({
        startAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      })
    )
    dbMock.booking.delete.mockResolvedValue({ id: 'booking-1' })

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')

    await cancelBooking(formData)

    expect(deleteGoogleCalendarEventForBookingMock).toHaveBeenCalledTimes(1)
    expect(dbMock.booking.delete).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/bookings')
  })

  it('rejects updating a booking with invalid half-hour step', async () => {
    await expect(
      updateBooking(updateFormData({ startTime: '10:15', endTime: '11:00' }))
    ).rejects.toThrow(
      'Bookings must start and end on the hour or half hour.'
    )
  })

  it('rejects updating a booking outside working hours', async () => {
    await expect(
      updateBooking(updateFormData({ startTime: '07:00', endTime: '08:00' }))
    ).rejects.toThrow(
      'Bookings must be within working hours 08:00-21:00.'
    )
  })

  it('rejects updating a booking that does not exist', async () => {
    dbMock.booking.findFirst.mockResolvedValue(null)

    await expect(updateBooking(updateFormData())).rejects.toThrow(
      'Booking not found.'
    )
  })

  it('rejects updating another user booking when not admin or owner', async () => {
    dbMock.booking.findFirst.mockResolvedValue(
      managedBooking({ userId: 'user-2' })
    )

    await expect(updateBooking(updateFormData())).rejects.toThrow(
      'You are not allowed to modify this booking.'
    )
  })

  it('rejects updating when room does not exist in tenant', async () => {
    dbMock.booking.findFirst.mockResolvedValue(managedBooking())
    dbMock.room.findFirst.mockResolvedValue(null)

    await expect(updateBooking(updateFormData())).rejects.toThrow(
      'Selected room does not exist in this workspace.'
    )
  })

  it('rejects updating when overlap exists', async () => {
    dbMock.booking.findFirst
      .mockResolvedValueOnce(managedBooking())
      .mockResolvedValueOnce({ id: 'booking-2' })
    dbMock.room.findFirst.mockResolvedValue({
      id: 'room-1',
      tenantId: 'tenant-1',
      name: 'Room 1',
    })

    await expect(updateBooking(updateFormData())).rejects.toThrow(
      'Booking overlaps an existing reservation.'
    )
  })

  it('updates booking when same-day change is valid', async () => {
    dbMock.booking.findFirst
      .mockResolvedValueOnce(managedBooking())
      .mockResolvedValueOnce(null)
    dbMock.room.findFirst.mockResolvedValue({
      id: 'room-1',
      tenantId: 'tenant-1',
      name: 'Room 1',
    })
    dbMock.booking.update.mockResolvedValue({
      ...managedBooking(),
      clientName: 'Updated Client',
      room: { id: 'room-1', name: 'Room 1' },
      user: { id: 'user-1' },
      tenant: { timezone: 'Europe/Bucharest' },
    })

    await updateBooking(updateFormData())

    expect(dbMock.booking.update).toHaveBeenCalledTimes(1)
    expect(updateGoogleCalendarEventForBookingMock).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/bookings')
  })
})
