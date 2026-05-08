import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

const { useFormStateMock, createFromActionMock, deleteFormActionMock, resetMock } = vi.hoisted(() => ({
  useFormStateMock: vi.fn(),
  createFromActionMock: vi.fn(),
  deleteFormActionMock: vi.fn(),
  resetMock: vi.fn(),
}))

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return {
    ...actual,
    useFormState: useFormStateMock,
  }
})

vi.mock('../actions', () => ({
  createRoomAction: vi.fn(),
  deleteRoomAction: vi.fn(),
}))

import { RoomForms } from '../RoomForms'

describe('RoomForms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createFromActionMock.mockResolvedValue(undefined)
    useFormStateMock
      .mockReturnValueOnce([{ ok: true, message: 'Room created successfully.' },createFromActionMock])
      .mockReturnValueOnce([{ ok: false, message: null }, deleteFormActionMock])
  })

  it('shows the success message', () =>{
    render(<RoomForms rooms={[]} />)

    expect(screen.getByText('Room created successfully.')).toBeInTheDocument()
  })

  it('wires the room name input and submit button', async () => {
    const user = userEvent.setup()

    render(<RoomForms rooms={[]} />)

    const input = screen.getByPlaceholderText('Room name')
    const button = screen.getByRole('button', { name: /add room/i })
  

    await user.type(input, 'Therapy Room 1')
    expect(input).toHaveValue('Therapy Room 1')
    expect(button).toBeInTheDocument()
    
   
  })
})
