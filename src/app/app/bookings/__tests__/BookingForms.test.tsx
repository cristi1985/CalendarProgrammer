import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

const { useFormStateMock, createFormActionMock, updateFormActionMock, cancelFormActionMock } = vi.hoisted(() => ({
  useFormStateMock: vi.fn(),
  createFormActionMock: vi.fn(),
  updateFormActionMock: vi.fn(),
  cancelFormActionMock: vi.fn(),
}))

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return { ...actual, useFormState: useFormStateMock }
})
vi.mock('../actions', () => ({ createBookingAction: vi.fn() }))
vi.mock('../manage-actions', () => ({ cancelBookingAction: vi.fn(), updateBookingAction: vi.fn() }))
vi.mock('@/components/AutoDismissMessage', () => ({
  AutoDismissMessage: ({ message, ok, id }: { message: string; ok: boolean; id: number }) => (
    <div data-testid="action-message" data-ok={String(ok)} data-id={id}>{message}</div>
  ),
}))

import { BookingForms } from '../BookingForms'

const rooms = [
  { id: 'room-1', name: 'Room 1' },
  { id: 'room-2', name: 'Room 2' },
]
const initialBookingValues = {
  roomId: 'room-2',
  date: '2026-05-12',
  startTime: '10:30',
  endTime: '11:30',
}
const booking = {
  id: 'booking-1',
  roomId: 'room-1',
  clientName: 'Jane Client',
  startAt: new Date('2026-06-15T07:30:00.000Z'),
  endAt: new Date('2026-06-15T08:30:00.000Z'),
  type: 'hourly',
  room: { name: 'Room 1' },
  user: { fullName: 'Member One' },
}

function renderBookingForms(overrides: Partial<ComponentProps<typeof BookingForms>> = {}) {
  return render(
    <BookingForms
      rooms={rooms}
      bookings={[]}
      selectedBooking={null}
      initialBookingValues={initialBookingValues}
      timezone="Europe/Bucharest"
      {...overrides}
    />
  )
}

function getCreateSelect(container: HTMLElement, name: string) {
  return container.querySelector(`form select[name="${name}"]`) as HTMLSelectElement
}

describe('BookingForms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFormStateMock
      .mockReturnValueOnce([{ ok: false, message: '', id: 0 }, createFormActionMock])
      .mockReturnValueOnce([{ ok: false, message: '', id: 0 }, updateFormActionMock])
      .mockReturnValueOnce([{ ok: false, message: '', id: 0 }, cancelFormActionMock])
  })

  it('preselects values passed from the calendar', () => {
    const { container } = renderBookingForms()
    expect(screen.getByRole('combobox', { name: /room/i })).toHaveValue('room-2')
    expect(container.querySelector('input[name="date"]')).toHaveValue('2026-05-12')
    expect(getCreateSelect(container, 'startTime')).toHaveValue('10:30')
    expect(getCreateSelect(container, 'endTime')).toHaveValue('11:30')
  })

  it('renders room, type, recurrence, and boundary time options', () => {
    const { container } = renderBookingForms()
    const roomSelect = screen.getByRole('combobox', { name: /room/i })
    expect(within(roomSelect).getByRole('option', { name: 'Room 1' })).toBeInTheDocument()
    expect(within(roomSelect).getByRole('option', { name: 'Room 2' })).toBeInTheDocument()

    const typeSelect = getCreateSelect(container, 'type')
    expect(within(typeSelect).getByRole('option', { name: 'Hourly' })).toBeInTheDocument()
    expect(within(typeSelect).getByRole('option', { name: 'Daily' })).toBeInTheDocument()

    const recurrenceSelect = getCreateSelect(container, 'recurrence')
    expect(within(recurrenceSelect).getByRole('option', { name: 'No recurrence' })).toBeInTheDocument()
    expect(within(recurrenceSelect).getByRole('option', { name: 'Weekly' })).toBeInTheDocument()

    const startSelect = getCreateSelect(container, 'startTime')
    expect(within(startSelect).getByRole('option', { name: '08:00' })).toBeInTheDocument()
    expect(within(startSelect).getByRole('option', { name: '21:00' })).toBeInTheDocument()
  })

  it('moves the create end time one hour after a valid start time', async () => {
    const user = userEvent.setup()
    const { container } = renderBookingForms()
    await user.selectOptions(getCreateSelect(container, 'startTime'), '14:30')
    expect(getCreateSelect(container, 'endTime')).toHaveValue('15:30')
  })

  it('keeps the create end time when the calculated value is unavailable', async () => {
    const user = userEvent.setup()
    const { container } = renderBookingForms()
    await user.selectOptions(getCreateSelect(container, 'startTime'), '20:30')
    expect(getCreateSelect(container, 'endTime')).toHaveValue('11:30')
  })

  it('renders booking details and timezone-aware edit defaults', async () => {
    const user = userEvent.setup()
    const { container } = renderBookingForms({ bookings: [booking] })

    expect(screen.getByText('Room 1', { selector: 'strong' }).parentElement).toHaveTextContent('Room 1 — Jane Client')
    expect(screen.getByText(/15-06-2026/)).toHaveTextContent(/15-06-2026.*10:30.*11:30/)
    expect(screen.getByText('Type: hourly')).toBeInTheDocument()

    await user.click(screen.getByText('Edit booking'))
    const editForm = container.querySelector('input[value="booking-1"]')?.closest('form') as HTMLFormElement
    expect(screen.getByLabelText('Client name', { selector: '#clientName-booking-1' })).toHaveValue('Jane Client')
    expect(editForm.querySelector('select[name="roomId"]')).toHaveValue('room-1')
    expect(editForm.querySelector('input[name="date"]')).toHaveValue('2026-06-15')
    expect(editForm.querySelector('select[name="startTime"]')).toHaveValue('10:30')
    expect(editForm.querySelector('select[name="endTime"]')).toHaveValue('11:30')
  })

  it('moves the edit end time one hour after start time', async () => {
    const user = userEvent.setup()
    const { container } = renderBookingForms({ bookings: [booking] })
    await user.click(screen.getByText('Edit booking'))
    const editForm = container.querySelector('input[value="booking-1"]')?.closest('form') as HTMLFormElement
    const start = editForm.querySelector('select[name="startTime"]') as HTMLSelectElement
    const end = editForm.querySelector('select[name="endTime"]') as HTMLSelectElement
    await user.selectOptions(start, '16:00')
    expect(end).toHaveValue('17:00')
  })

  it('uses an empty edit client value when the stored client is null', async () => {
    const user = userEvent.setup()
    renderBookingForms({ bookings: [{ ...booking, clientName: null }] })
    await user.click(screen.getByText('Edit booking'))
    expect(screen.getByLabelText('Client name', { selector: '#clientName-booking-1' })).toHaveValue('')
  })

  it('passes create, update, and cancel messages to the message component', () => {
    useFormStateMock.mockReset()
    useFormStateMock
      .mockReturnValueOnce([{ ok: true, message: 'Created', id: 1 }, createFormActionMock])
      .mockReturnValueOnce([{ ok: false, message: 'Update failed', id: 2 }, updateFormActionMock])
      .mockReturnValueOnce([{ ok: true, message: 'Cancelled', id: 3 }, cancelFormActionMock])

    renderBookingForms()
    const messages = screen.getAllByTestId('action-message')
    expect(messages[0]).toHaveTextContent('Created')
    expect(messages[0]).toHaveAttribute('data-ok', 'true')
    expect(messages[1]).toHaveTextContent('Update failed')
    expect(messages[2]).toHaveTextContent('Cancelled')
    expect(messages[2]).toHaveAttribute('data-id', '3')
  })

  it('renders create, cancel, and expanded edit controls', async () => {
    const user = userEvent.setup()
    renderBookingForms({ bookings: [booking] })
    expect(screen.getByRole('button', { name: 'Create booking' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument()
    await user.click(screen.getByText('Edit booking'))
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('does not change the end time when the start selection is empty', () => {
    const { container } = renderBookingForms()
    fireEvent.change(getCreateSelect(container, 'startTime'), { target: { value: '' } })
    expect(getCreateSelect(container, 'endTime')).toHaveValue('11:30')
  })

  it('hides the selected booking section when no booking was selected from the calendar', () => {
    renderBookingForms()

    expect(
      screen.queryByRole('heading', { name: 'Selected Booking' })
    ).not.toBeInTheDocument()
  })

  it('shows a selected booking that is outside the recent bookings list and expands its edit controls', () => {
    const selectedBooking = {
      ...booking,
      id: 'selected-booking',
      clientName: 'Selected Client',
    }

    renderBookingForms({
      bookings: [booking],
      selectedBooking,
    })

    const selectedHeading = screen.getByRole('heading', {
      name: 'Selected Booking',
    })
    const selectedSection = selectedHeading.closest('section')

    expect(selectedSection).not.toBeNull()
    expect(within(selectedSection as HTMLElement).getByText(/Selected Client/)).toBeInTheDocument()
    expect(selectedSection?.querySelector('details')).toHaveAttribute('open')
    expect(
      screen.getByRole('heading', { name: 'Recent bookings' }).closest('section')
    ).not.toHaveTextContent('Selected Client')
  })

  it('does not duplicate a selected booking in the recent bookings section', () => {
    const { container } = renderBookingForms({
      bookings: [booking],
      selectedBooking: booking,
    })

    expect(container.querySelectorAll('input[value="booking-1"]')).toHaveLength(2)
  })
})
