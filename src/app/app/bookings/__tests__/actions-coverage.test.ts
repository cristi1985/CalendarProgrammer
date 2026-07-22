import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
    room: { findFirst: vi.fn() },
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

vi.mock('@/lib/db', () => ({ db: dbMock }))

vi.mock('@/lib/google-calendar', () => ({
  createGoogleCalendarEventForBooking: (...args: unknown[]) =>
    createGoogleCalendarEventForBookingMock(...args),
}))

import { createBooking, createBookingAction } from '../actions'

function formData(overrides: Record<string, string> = {}) {
  const values = {
    roomId: 'room-1',
    type: 'hourly',
    recurrence: 'none',
    date: '2026-06-20',
    startTime: '10:00',
    endTime: '11:00',
    clientName: 'Coverage Client',
    ...overrides,
  }

  const data = new FormData()
  Object.entries(values).forEach(([key, value]) => data.set(key, value))
  return data
}

function authResult(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user-1' },
    tenantUser: {
      tenantId: 'tenant-1',
      role: 'member',
      isPermanent: true,
      tenant: { timezone: 'Europe/Bucharest' },
      ...overrides,
    },
  }
}

describe('createBooking additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T09:00:00.000Z'))

    syncAuthenticatedUserMock.mockResolvedValue(authResult())
    dbMock.room.findFirst.mockResolvedValue({
      id: 'room-1',
      tenantId: 'tenant-1',
      name: 'Room 1',
    })
    dbMock.booking.findFirst.mockResolvedValue(null)
    dbMock.tenantUser.findMany.mockResolvedValue([])
    dbMock.booking.create.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      roomId: 'room-1',
      clientName: 'Coverage Client',
      startAt: new Date('2026-06-20T07:00:00.000Z'),
      endAt: new Date('2026-06-20T08:00:00.000Z'),
      type: 'hourly',
      room: { id: 'room-1', name: 'Room 1' },
      user: { id: 'user-1' },
      tenant: { timezone: 'Europe/Bucharest' },
    })
    createGoogleCalendarEventForBookingMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('uses Europe/Bucharest when the tenant timezone is null', async () => {
    syncAuthenticatedUserMock.mockResolvedValue(
      authResult({ tenant: { timezone: null } })
    )

    await createBooking(formData())

    expect(dbMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startAt: new Date('2026-06-20T07:00:00.000Z'),
          endAt: new Date('2026-06-20T08:00:00.000Z'),
        }),
      })
    )
  })

  it('creates weekly recurring bookings', async () => {
    await createBooking(
      formData({
        recurrence: 'weekly',
        recurrenceUntil: '2026-07-04',
      })
    )

    expect(dbMock.booking.create).toHaveBeenCalledTimes(2)
    expect(createGoogleCalendarEventForBookingMock).toHaveBeenCalledTimes(2)
  })

  it('rejects a missing room id', async () => {
    const data = formData()
    data.delete('roomId')

    await expect(createBooking(data)).rejects.toThrow('Room is required.')
  })

  it('rejects a client name shorter than two characters', async () => {
    await expect(
      createBooking(formData({ clientName: 'A' }))
    ).rejects.toThrow('Client name must be at least 2 characters long.')
  })

  it('blocks a non-permanent member booking more than 14 days ahead', async () => {
    syncAuthenticatedUserMock.mockResolvedValue(
      authResult({ isPermanent: false })
    )

    await expect(
      createBooking(formData({ date: '2026-06-30' }))
    ).rejects.toThrow(
      'Non-permanent members can only create bookings up to 14 days in advance.'
    )
  })

  it('continues when Google Calendar synchronization fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    createGoogleCalendarEventForBookingMock.mockRejectedValue(
      new Error('Google unavailable')
    )

    await createBooking(formData())

    expect(dbMock.booking.create).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledWith(
      'Error creating Google Calendar event:',
      expect.any(Error)
    )
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/bookings')
  })

  it('returns a failed action state for validation errors', async () => {
    const state = await createBookingAction(
      { ok: true, message: '', id: 0 },
      formData({ clientName: '' })
    )

    expect(state).toEqual(
      expect.objectContaining({
        ok: false,
        message: 'Client name must be at least 2 characters long.',
      })
    )
  })

  it('returns a successful action state after creating a booking', async () => {
    const state = await createBookingAction(
      { ok: false, message: '', id: 0 },
      formData()
    )

    expect(state).toEqual(
      expect.objectContaining({
        ok: true,
        message: 'Booking created successfully.',
      })
    )
  })
})
