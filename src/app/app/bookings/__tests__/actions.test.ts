import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  redirectMock,
  revalidatePathMock,
  syncAuthenticatedUserMock,
  createGoogleCalendarEventForBookingMock,
  sendBookingCreatedEmailMock,
  dbMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  syncAuthenticatedUserMock: vi.fn(),
  createGoogleCalendarEventForBookingMock: vi.fn(),
  sendBookingCreatedEmailMock: vi.fn(),
  dbMock: {
    room: {
      findFirst: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    tenantUser: {
      findMany: vi.fn(),
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

vi.mock('@/lib/email', () => ({
  sendBookingCreatedEmail: (...args: unknown[]) =>
    sendBookingCreatedEmailMock(...args),
}))

import { createBooking } from '../actions'

function createValidFormData(overrides: Record<string, string> = {}) {
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

describe('createBooking action', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1', fullName: 'Test User' },
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
    dbMock.tenantUser.findMany.mockResolvedValue([
      { user: { email: 'owner@example.com' } },
    ])
    dbMock.booking.create.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      roomId: 'room-1',
      clientName: 'Test Client',
      startAt: new Date('2025-01-01T08:00:00.000Z'),
      endAt: new Date('2025-01-01T09:00:00.000Z'),
      type: 'hourly',
      room: { id: 'room-1', name: 'Room 1' },
      user: { id: 'user-1' },
      tenant: { timezone: 'Europe/Bucharest' },
    })
    createGoogleCalendarEventForBookingMock.mockResolvedValue(undefined)
    sendBookingCreatedEmailMock.mockResolvedValue(undefined)
  })

  it('creates a valid single booking', async () => {
    await createBooking(createValidFormData())

    expect(dbMock.booking.create).toHaveBeenCalledTimes(1)
    expect(createGoogleCalendarEventForBookingMock).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/bookings')
  })

  it('notifies an owner in the same tenant after another user creates a booking', async () => {
    await createBooking(createValidFormData())

    expect(dbMock.tenantUser.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        role: 'owner',
        userId: { not: 'user-1' },
      },
      select: {
        user: {
          select: {
            email: true,
          },
        },
      },
    })
    expect(sendBookingCreatedEmailMock).toHaveBeenCalledWith({
      to: 'owner@example.com',
      bookedByName: 'Test User',
      roomName: 'Room 1',
      startAt: '2025-01-01T08:00:00.000Z',
      endAt: '2025-01-01T09:00:00.000Z',
      timeZone: 'Europe/Bucharest',
    })
  })

  it('does not send an email when there is no other owner to notify', async () => {
    dbMock.tenantUser.findMany.mockResolvedValue([])

    await createBooking(createValidFormData())

    expect(sendBookingCreatedEmailMock).not.toHaveBeenCalled()
  })

  it('keeps the booking successful when an owner notification fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const emailError = new Error('Resend unavailable')
    sendBookingCreatedEmailMock.mockRejectedValue(emailError)

    await expect(createBooking(createValidFormData())).resolves.toBeUndefined()

    expect(dbMock.booking.create).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/bookings')
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to send email to owner@example.com:',
      emailError
    )

    consoleError.mockRestore()
  })

  it('rejects overlapping bookings', async () => {
    dbMock.booking.findFirst.mockResolvedValue({ id: 'existing-booking' })

    await expect(createBooking(createValidFormData())).rejects.toThrow(
      'Booking overlaps an existing reservation.'
    )
  })

  it('rejects recurrence beyond 14 days', async () => {
    await expect(
      createBooking(
        createValidFormData({
          recurrence: 'daily',
          recurrenceUntil: '2025-01-20',
        })
      )
    ).rejects.toThrow(
      'Recurring bookings can only be created up to 14 days in advance.'
    )
  })

  it('creates recurring daily bookings within 14 days', async () => {
    await createBooking(
      createValidFormData({
        recurrence: 'daily',
        recurrenceUntil: '2025-01-03',
      })
    )

    expect(dbMock.booking.create).toHaveBeenCalledTimes(2)
    expect(createGoogleCalendarEventForBookingMock).toHaveBeenCalledTimes(2)
  })

  it('rejects bookings not aligned to hour or half hour', async () => {
    await expect(
      createBooking(createValidFormData({ startTime: '10:15' }))
    ).rejects.toThrow(
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
    await expect(
      createBooking(createValidFormData({ type: 'weird-type' }))
    ).rejects.toThrow('Booking type is invalid.')
  })

  it('rejects invalid recurrence type', async () => {
    await expect(
      createBooking(createValidFormData({ recurrence: 'monthly' }))
    ).rejects.toThrow('Recurrence type is invalid.')
  })

  it('rejects missing recurrence end date for recurring bookings', async () => {
    await expect(
      createBooking(createValidFormData({ recurrence: 'daily' }))
    ).rejects.toThrow(
      'Recurrence end date is required for recurring bookings.'
    )
  })

  it('rejects booking outside working hours', async () => {
    await expect(
      createBooking(
        createValidFormData({ startTime: '07:00', endTime: '08:00' })
      )
    ).rejects.toThrow(
      'Bookings must be within working hours 08:00-21:00.'
    )
  })

  it('rejects invalid time order', async () => {
    await expect(
      createBooking(
        createValidFormData({ startTime: '11:00', endTime: '10:00' })
      )
    ).rejects.toThrow('Booking start time must be before end time.')
  })

  it('rejects room outside tenant workspace', async () => {
    dbMock.room.findFirst.mockResolvedValue(null)

    await expect(
      createBooking(createValidFormData({ roomId: 'room-x' }))
    ).rejects.toThrow('Selected room does not exist in this workspace.')
  })
})
