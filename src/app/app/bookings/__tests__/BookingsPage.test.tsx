import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  syncAuthenticatedUserMock,
  roomFindManyMock,
  bookingFindManyMock,
  bookingFindFirstMock,
  bookingFormsMock,
  redirectMock,
} = vi.hoisted(() => ({
  syncAuthenticatedUserMock: vi.fn(),
  roomFindManyMock: vi.fn(),
  bookingFindManyMock: vi.fn(),
  bookingFindFirstMock: vi.fn(),
  bookingFormsMock: vi.fn(),
  redirectMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  syncAuthenticatedUser: syncAuthenticatedUserMock,
}))

vi.mock('@/lib/db', () => ({
  db: {
    room: {
      findMany: roomFindManyMock,
    },
    booking: {
      findMany: bookingFindManyMock,
      findFirst: bookingFindFirstMock,
    },
  },
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('../BookingForms', () => ({
  BookingForms: (props: unknown) => {
    bookingFormsMock(props)
    return <div data-testid="booking-forms" />
  },
}))

import BookingsPage from '../page'

const room = {
  id: 'room-1',
  name: 'Room 1',
}

const recentBooking = {
  id: 'recent-booking',
  roomId: 'room-1',
  clientName: 'Recent Client',
  startAt: new Date('2026-07-10T07:00:00.000Z'),
  endAt: new Date('2026-07-10T08:00:00.000Z'),
  type: 'hourly',
  room: { name: 'Room 1' },
  user: { fullName: 'Member One' },
}

const selectedBooking = {
  ...recentBooking,
  id: 'selected-booking',
  clientName: 'Selected Client',
  startAt: new Date('2027-01-10T07:00:00.000Z'),
  endAt: new Date('2027-01-10T08:00:00.000Z'),
}

function renderedBookingFormsProps() {
  return bookingFormsMock.mock.calls.at(-1)?.[0] as {
    bookings: typeof recentBooking[]
    selectedBooking: typeof selectedBooking | null
  }
}

describe('BookingsPage selected booking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    syncAuthenticatedUserMock.mockResolvedValue({
      tenantUser: {
        tenantId: 'tenant-1',
        tenant: {
          timezone: 'Europe/Bucharest',
        },
      },
    })
    roomFindManyMock.mockResolvedValue([room])
    bookingFindManyMock.mockResolvedValue([recentBooking])
    bookingFindFirstMock.mockResolvedValue(selectedBooking)
  })

  it('loads the calendar-selected booking separately from the 20 recent bookings', async () => {
    render(
      await BookingsPage({
        searchParams: { editBookingId: 'selected-booking' },
      })
    )

    expect(bookingFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        where: { tenantId: 'tenant-1' },
      })
    )
    expect(bookingFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: 'selected-booking',
        tenantId: 'tenant-1',
      },
      include: {
        room: true,
        user: true,
      },
    })
    expect(renderedBookingFormsProps().bookings).toEqual([recentBooking])
    expect(renderedBookingFormsProps().selectedBooking).toEqual(selectedBooking)
  })

  it('does not query or show a selected booking without editBookingId', async () => {
    render(await BookingsPage({ searchParams: {} }))

    expect(bookingFindFirstMock).not.toHaveBeenCalled()
    expect(renderedBookingFormsProps().selectedBooking).toBeNull()
  })

  it('does not show an invalid or cross-tenant selected booking', async () => {
    bookingFindFirstMock.mockResolvedValue(null)

    render(
      await BookingsPage({
        searchParams: { editBookingId: 'other-tenant-booking' },
      })
    )

    expect(bookingFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'other-tenant-booking',
          tenantId: 'tenant-1',
        },
      })
    )
    expect(renderedBookingFormsProps().selectedBooking).toBeNull()
  })
})
