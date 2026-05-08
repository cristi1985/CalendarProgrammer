import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

const { useFormStateMock, createFromActionMock, deleteRoomActionMock } = vi.hoisted(() => ({
  useFormStateMock: vi.fn(),
  createFromActionMock: vi.fn(),
  deleteRoomActionMock: vi.fn(),
}))

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return {
    ...actual,
    useFormState: useFormStateMock,
  }
})

vi.mock('../actions', () => ({
  createRoomAction: createFromActionMock,
  deleteRoomAction: deleteRoomActionMock,
}))

import { RoomForms } from '../RoomForms'

describe('RoomForms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFormStateMock
      .mockReturnValueOnce([{ ok: true, message: 'Room created successfully.' }, vi.fn()])
      .mockReturnValueOnce([{ ok: false, message: null }, vi.fn()])
  })

  it('clears the room name input after a room is successfully added', async () => {
    const user = userEvent.setup()

    render(<RoomForms rooms={[]} />)

    const input = screen.getByPlaceholderText('Room name')

    await user.type(input, 'Therapy Room 1')

    expect(input).toHaveValue('Therapy Room 1')
    expect(screen.getByText('Room created successfully.')).toBeInTheDocument()
    expect(input).toHaveValue()
  })
})
