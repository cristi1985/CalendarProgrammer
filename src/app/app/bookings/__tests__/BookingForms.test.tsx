import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const {
  useFormStateMock,
} = vi.hoisted(() => ({
  useFormStateMock: vi.fn((action, initialState) => [initialState, vi.fn()]),
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

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('roomId=room-2&startAt=2026-05-12T10:30'),
}))

import { BookingForms } from '../BookingForms'

describe('BookingForms calendar preselection', () => {
  it('preselects room, date and start time when opened from calendar link', () => {
    vi.mock('next/navigation', () => ({
        useSearchParams: () => new URLSearchParams('roomId=room-2&startAt=2026-05-12T10:30'),
      }));

    expect(screen.getByRole('combobox', { name: /room/i })).toHaveValue('room-2')
    expect(screen.getByLabelText(/date/i)).toHaveValue('2026-05-12')
    expect(screen.getByLabelText(/start time/i)).toHaveValue('10:30')
    expect(screen.getByLabelText(/end time/i)).toHaveValue('11:30')
  })
})
