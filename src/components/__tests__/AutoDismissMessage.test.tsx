import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import { act, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AutoDismissMessage } from '../AutoDismissMessage'

describe('AutoDismissMessage', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.runOnlyPendingTimers()
        vi.useRealTimers()
    })

    it('shows the message initialyy', () => {
        render(<AutoDismissMessage message="Room created successfully!" ok />)

        expect(screen.getByText('Room created successfully!')).toBeInTheDocument()
    })

    it('hides the message after 5 seconds', () =>{
        render(<AutoDismissMessage message="Room created successfully!" ok />)

        expect(screen.getByText('Room created successfully!')).toBeInTheDocument()

        act(() => {
            vi.advanceTimersByTime(5000)
        })

        expect(screen.queryByText('Room created successfully!')).not.toBeInTheDocument()
    })
})