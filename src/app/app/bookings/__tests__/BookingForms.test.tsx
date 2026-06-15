import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

const {
  useFormStateMock,
  createFormActionMock,
  updateFormActionMock,
  cancelFormActionMock,
} = vi.hoisted(() => ({
  useFormStateMock: vi.fn(),
  createFormActionMock: vi.fn(),
  updateFormActionMock: vi.fn(),
  cancelFormActionMock: vi.fn(),
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

vi.mock('@/components/AutoDismissMessage', () => ({
  AutoDismissMessage: ({
    message,
    ok,
    id,
  }: {
    message: string
    ok: boolean
    id: number
  }) => (
    <div data-testid="action-message" data-ok={String(ok)} data-id={id}>
      {message}
    </div>
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

function renderBookingForms(
  overrides: Partial<React.ComponentProps<typeof BookingForms>> = {}
) {
  return render(
    <BookingForms
      rooms={rooms}
      bookings={[]}
      initialBookingValues={initialBookingValues}
      timezone="Europe/Bucharest"
      {...overrides}
    />
  )
}

describe('BookingForms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFormStateMock
      .mockReturnValueOnce([
        { ok: false, message: '', id: 0 },
        createFormActionMock,
      ])
      .mockReturnValueOnce([
        { ok: false, message: '', id: 0 },
        updateFormActionMock,
      ])
      .mockReturnValueOnce([
        { ok: false, message: '', id: 0 },
        cancelFormActionMock,
      ])
  })

  it('preselects room, date, start time, and end time from initial values', () => {
    const { container } = renderBookingForms()

    expect(screen.getByRole('combobox', { name: /room/i })).toHaveValue('room-2')
    expect(container.querySelector('input[name="date"]')).toHaveValue('2026-05-12')
    expect(container.querySelector('select[name="startTime"]')).toHaveValue('10:30')
    expect(container.querySelector('select[name="endTime"]')).toHaveValue('11:30')
  })

  it('renders all rooms, booking types, recurrence options, and time boundaries', () => {
    const { container } = renderBookingForms()

    const roomSelect = screen.getByRole('combobox', { name: /room/i })
    expect(within(roomSelect).getByRole('option', { name: 'Room 1' })).toBeInTheDocument()
    expect(within(roomSelect).getByRole('option', { name: 'Room 2' })).toBeInTheDocument()

    const typeSelect = container.querySelector('select[name="type"]') as HTMLSelectElement
    expect(within(typeSelect).getByRole('option', { name: 'Hourly' })).toBeInTheDocument()
    expect(within(typeSelect).getByRole('option', { name: 'Daily' })).toBeInTheDocument()

    const recurrenceSelect = container.querySelector(
      'select[name="recurrence"]'
    ) as HTMLSelectElement
    expect(within(recurrenceSelect).getByRole('option', { name: 'No recurrence' })).toBeInTheDocument()
    expect(within(recurrenceSelect).getByRole('option', { name: 'Daily' })).toBeInTheDocument()
    expect(within(recurrenceSelect).getByRole('option', { name: 'Weekly' })).toBeInTheDocument()

    const startSelect = container.querySelector(
      'select[name="startTime"]'
    ) as HTMLSelectElement
    expect(within(startSelect).getByRole('option', { name: '08:00' })).toBeInTheDocument()
    expect(within(startSelect).getByRole('option', { name: '21:00' })).toBeInTheDocument()
  })

  it('automatically moves the create-form end time one hour after start time', async () => {
    const user = userEvent.setup()
    const { container } = renderBookingForms()
    const startSelect = container.querySelector(
      'select[name="startTime"]'
    ) as HTMLSelectElement
    const endSelect = container.querySelector(
      'select[name="endTime"]'
    ) as HTMLSelectElement

    await user.selectOptions(startSelect, '14:30')

    expect(endSelect).toHaveValue('15:30')
  })

  it('keeps the existing end time when start plus one hour is outside available options', async () => {
    const user = userEvent.setup()
    const { container } = renderBookingForms()
    const startSelect = container.querySelector(
      'select[name="startTime"]'
    ) as HTMLSelectElement
    const endSelect = container.querySelector(
      'select[name="endTime"]'
    ) as HTMLSelectElement

    await user.selectOptions(startSelect, '20:30')

    expect(endSelect).toHaveValue('11:30')
  })

  it('renders a recent booking using the supplied timezone', () => {
    renderBookingForms({ bookings: [booking] })

    expect(screen.getByText(/Room 1/)).toHaveTextContent('Room 1 — Jane Client')
    expect(screen.getByText(/15-06-2026/)).toHaveTextContent(
      '15-06-2026 10:30 → 11:30'
    )
    expect(screen.getByText('Type: hourly')).toBeInTheDocument()
  })

  it('populates edit fields from the booking in the supplied timezone', async () => {
    const user = userEvent.setup()
    const { container } = renderBookingForms({ bookings: [booking] })

    await user.click(screen.getByText('Edit booking'))

    expect(screen.getByLabelText('Client name', { selector: '#clientName-booking-1' })).toHaveValue(
      'Jane Client'
    )

    const editForm = container.querySelector(
      'input[value="booking-1"]'
    )?.closest('form') as HTMLFormElement

    expect(editForm.querySelector('select[name="roomId"]')).toHaveValue('room-1')
    expect(editForm.querySelector('input[name="date"]')).toHaveValue('2026-06-15')
    expect(editForm.querySelector('select[name="startTime"]')).toHaveValue('10:30')
    expect(editForm.querySelector('select[name="endTime"]')).toHaveValue('11:30')
  })

  it('automatically moves the edit-form end time one hour after start time', async () => {
    const user = userEvent.setup()
    const { container } = renderBookingForms({ bookings: [booking] })
    await user.click(screen.getByText('Edit booking'))

    const editForm = container.querySelector(
      'input[value="booking-1"]'
    )?.closest('form') as HTMLFormElement
    const startSelect = editForm.querySelector(
      'select[name="startTime"]'
    ) as HTMLSelectElement
    const endSelect = editForm.querySelector(
      'select[name="endTime"]'
    ) as HTMLSelectElement

    await user.selectOptions(startSelect, '16:00')

    expect(endSelect).toHaveValue('17:00')
  })

  it('uses an empty edit client name when the booking client is null', async () => {
    const user = userEvent.setup()
    renderBookingForms({
      bookings: [{ ...booking, clientName: null }],
    })

    await user.click(screen.getByText('Edit booking'))

    expect(screen.getByLabelText('Client name', { selector: '#clientName-booking-1' })).toHaveValue('')
  })

  it('passes create, update, and cancel action messages to AutoDismissMessage', () => {
    useFormStateMock.mockReset()
    useFormStateMock
      .mockReturnValueOnce([
        { ok: true, message: 'Created', id: 1 },
        createFormActionMock,
      ])
      .mockReturnValueOnce([
        { ok: false, message: 'Update failed', id: 2 },
        updateFormActionMock,
      ])
      .mockReturnValueOnce([
        { ok: true, message: 'Cancelled', id: 3 },
        cancelFormActionMock,
      ])

    renderBookingForms()

    const messages = screen.getAllByTestId('action-message')
    expect(messages[0]).toHaveTextContent('Created')
    expect(messages[0]).toHaveAttribute('data-ok', 'true')
    expect(messages[1]).toHaveTextContent('Update failed')
    expect(messages[1]).toHaveAttribute('data-ok', 'false')
    expect(messages[2]).toHaveTextContent('Cancelled')
    expect(messages[2]).toHaveAttribute('data-id', '3')
  })

  it('renders create, save, and cancel controls', () => {
    renderBookingForms({ bookings: [booking] })

    expect(screen.getByRole('button', { name: 'Create booking' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument()
  })

  it('does not change an end time when an invalid start value is dispatched', () => {
    const { container } = renderBookingForms()
    const startSelect = container.querySelector(
      'select[name="startTime"]'
    ) as HTMLSelectElement
    const endSelect = container.querySelector(
      'select[name="endTime"]'
    ) as HTMLSelectElement

    fireEvent.change(startSelect, { target: { value: '' } })

    expect(endSelect).toHaveValue('11:30')
  })
})
