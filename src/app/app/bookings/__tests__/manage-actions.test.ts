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
  syncAuthenticatedUser: (...args: unknown[]) => syncAuthenticatedUserMock(...args),
}))

vi.mock('@/lib/db', () => ({
  db: dbMock,
}))

import { cancelBooking, updateBooking } from '../manage-actions'

describe('booking manage actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

    it('rejects cancelling a booking that does not exist', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    dbMock.booking.findFirst.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('bookingId', 'missing-booking')

    await expect(cancelBooking(formData)).rejects.toThrow('Booking not found.')
  })

  it('rejects cancelling another user booking when not admin or owner', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    dbMock.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      userId: 'user-2',
      startAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 49 * 60 * 60 * 1000),
      roomId: 'room-1',
      type: 'hourly',
    })

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')

    await expect(cancelBooking(formData)).rejects.toThrow(
      'You are not allowed to cancel this booking.'
    )
  })

  it('rejects updating a booking that does not exist', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    dbMock.booking.findFirst.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('bookingId', 'missing-booking')
    formData.set('roomId', 'room-1')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '10:00')
    formData.set('endTime', '11:00')

    await expect(updateBooking(formData)).rejects.toThrow('Booking not found.')
  })

  it('rejects updating a booking with invalid half-hour step', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')
    formData.set('roomId', 'room-1')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '10:15')
    formData.set('endTime', '11:00')

    await expect(updateBooking(formData)).rejects.toThrow(
      'Bookings must start and end on the hour or half hour.'
    )
  })

  it('rejects updating a booking outside working hours', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')
    formData.set('roomId', 'room-1')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '07:00')
    formData.set('endTime', '08:00')

    await expect(updateBooking(formData)).rejects.toThrow(
      'Bookings must be within working hours 08:00-21:00.'
    )
  })

  it('rejects updating another user booking when not admin or owner', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    dbMock.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      userId: 'user-2',
      startAt: new Date('2025-01-01T10:00:00'),
      endAt: new Date('2025-01-01T11:00:00'),
      roomId: 'room-1',
      type: 'hourly',
    })

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')
    formData.set('roomId', 'room-1')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '12:00')
    formData.set('endTime', '13:00')

    await expect(updateBooking(formData)).rejects.toThrow(
      'You are not allowed to modify this booking.'
    )
  })

  it('rejects updating when room does not exist in tenant', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    dbMock.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      startAt: new Date('2025-01-01T10:00:00'),
      endAt: new Date('2025-01-01T11:00:00'),
      roomId: 'room-1',
      type: 'hourly',
    })

    dbMock.room.findFirst.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')
    formData.set('roomId', 'room-x')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '12:00')
    formData.set('endTime', '13:00')

    await expect(updateBooking(formData)).rejects.toThrow(
      'Selected room does not exist in this workspace.'
    )
  })

  it('rejects updating when overlap exists', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    dbMock.booking.findFirst
      .mockResolvedValueOnce({
        id: 'booking-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        startAt: new Date('2025-01-01T10:00:00'),
        endAt: new Date('2025-01-01T11:00:00'),
        roomId: 'room-1',
        type: 'hourly',
      })
      .mockResolvedValueOnce({
        id: 'booking-2',
        tenantId: 'tenant-1',
        roomId: 'room-1',
      })

    dbMock.room.findFirst.mockResolvedValue({
      id: 'room-1',
      tenantId: 'tenant-1',
      name: 'Room 1',
    })

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')
    formData.set('roomId', 'room-1')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '12:00')
    formData.set('endTime', '13:00')

    await expect(updateBooking(formData)).rejects.toThrow(
      'Booking overlaps an existing reservation.'
    )
  })

  it('blocks regular users from cancelling within 24 hours', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    dbMock.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      startAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      roomId: 'room-1',
      type: 'hourly',
    })

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')

    await expect(cancelBooking(formData)).rejects.toThrow(
      'Bookings can only be cancelled more than 24 hours in advance.'
    )
  })

  it('allows permanent users to cancel without 24 hour notice', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: true },
    })

    dbMock.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      startAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      roomId: 'room-1',
      type: 'hourly',
    })

    dbMock.booking.delete.mockResolvedValue({ id: 'booking-1' })

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')

    await cancelBooking(formData)

    expect(dbMock.booking.delete).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/bookings')
  })

  it('rejects updates that move booking to another day', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    dbMock.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      startAt: new Date('2025-01-01T10:00:00'),
      endAt: new Date('2025-01-01T11:00:00'),
      roomId: 'room-1',
      type: 'hourly',
    })

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')
    formData.set('roomId', 'room-1')
    formData.set('date', '2025-01-02')
    formData.set('startTime', '10:00')
    formData.set('endTime', '11:00')

    await expect(updateBooking(formData)).rejects.toThrow(
      'Bookings can only be modified within the same calendar day.'
    )
  })

  it('updates booking when same-day change is valid', async () => {
    syncAuthenticatedUserMock.mockResolvedValue({
      user: { id: 'user-1' },
      tenantUser: { tenantId: 'tenant-1', role: 'member', isPermanent: false },
    })

    dbMock.booking.findFirst
      .mockResolvedValueOnce({
        id: 'booking-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        startAt: new Date('2025-01-01T10:00:00'),
        endAt: new Date('2025-01-01T11:00:00'),
        roomId: 'room-1',
        type: 'hourly',
      })
      .mockResolvedValueOnce(null)

    dbMock.room.findFirst.mockResolvedValue({
      id: 'room-1',
      tenantId: 'tenant-1',
      name: 'Room 1',
    })

    dbMock.booking.update.mockResolvedValue({ id: 'booking-1' })

    const formData = new FormData()
    formData.set('bookingId', 'booking-1')
    formData.set('roomId', 'room-1')
    formData.set('date', '2025-01-01')
    formData.set('startTime', '12:00')
    formData.set('endTime', '13:00')

    await updateBooking(formData)

    expect(dbMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        roomId: 'room-1',
        startAt: new Date('2025-01-01T12:00'),
        endAt: new Date('2025-01-01T13:00'),
      },
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/bookings')
  })

  it('rejects cancelling a booking from a previous day', async () => {
  syncAuthenticatedUserMock.mockResolvedValue({
    user: { id: 'user-1' },
    tenantUser: { tenantId: 'tenant-1', role: 'owner', isPermanent: false },
  })

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(10, 0, 0, 0)

  const yesterdayEnd = new Date(yesterday)
  yesterdayEnd.setHours(11, 0, 0, 0)

  dbMock.booking.findFirst.mockResolvedValue({
    id: 'booking-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    startAt: yesterday,
    endAt: yesterdayEnd,
    roomId: 'room-1',
    type: 'hourly',
  })

  const formData = new FormData()
  formData.set('bookingId', 'booking-1')

  await expect(cancelBooking(formData)).rejects.toThrow(
    'Past bookings can only be cancelled on the same calendar day.'
  )
})
})
