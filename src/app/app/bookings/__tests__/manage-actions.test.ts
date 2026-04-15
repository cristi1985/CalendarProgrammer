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
    formData.set('startAt', '2025-01-02T10:00')
    formData.set('endAt', '2025-01-02T11:00')

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
    formData.set('startAt', '2025-01-01T12:00')
    formData.set('endAt', '2025-01-01T13:00')

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
})
