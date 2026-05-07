import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const { useFormStateMock } = vi.hoisted(() => ({
  useFormStateMock: vi.fn(),
}))

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return {
    ...actual,
    useFormState: useFormStateMock,
  }
})

vi.mock('../actions', () => ({
  createBookingAction: vi.fn(),
}))

vi.mock('../manage-actions', () => ({
  cancelBookingAction: vi.fn(),
  updateBookingAction: vi.fn(),
}))

import { BookingForms } from '../BookingForms'

describe('BookingForms toast notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useFormStateMock
      .mockReturnValueOnce([
        { ok: true, message: 'Booking created successfully.' },
        vi.fn(),
      ])
      .mockReturnValueOnce([{ ok: false, message: null }, vi.fn()])
      .mockReturnValueOnce([{ ok: false, message: null }, vi.fn()])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows action notification as a toast and removes it after 5 seconds', () => {
    render(<BookingForms rooms={[]} bookings={[]} />)

    expect(screen.getByText('Booking created successfully.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.queryByText('Booking created successfully.')).not.toBeInTheDocument()
  })
})
