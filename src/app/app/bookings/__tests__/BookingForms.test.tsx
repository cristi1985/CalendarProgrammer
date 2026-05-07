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


import { BookingForms } from '../BookingForms'

describe('BookingForms calendar preselection', () => {
  it('preselects room, date and start time when opened from calendar link', () => {
   render(
     <BookingForms
       rooms={[{ id: 'room-2', name: 'Room 2' }]}
       bookings={[]}
       initialBookingValues={{
         roomId: 'room-2',
         date: '2026-05-12',
         startTime: '10:30',
         endTime: '11:30'
       }}
     />
   )

    expect(screen.getByRole('combobox', { name: /room/i })).toHaveValue('room-2')
    expect(document.querySelector('input[name="date"]')).toHaveValue('2026-05-12')
    expect(document.querySelector('select[name="startTime"]')).toHaveValue('10:30')
    expect(document.querySelector('select[name="endTime"]')).toHaveValue('11:30')
  })
})
