'use client'

import { useEffect, useState } from "react"

type AutoDismissMessageProps = {
    message?: string | null
    ok: boolean
    duration?: number
}

export function AutoDismissMessage({
     message,
     ok,
     duration = 5000,
     }: AutoDismissMessageProps) {
    const [visibleMessage, setVisibleMessage] = useState(message)

    useEffect(() => {
        setVisibleMessage(message)

        if(!message) { 
            return
        }

        const timeoutId = window.setTimeout(() => {
            setVisibleMessage(null)
        }, duration)

        return () => {
            window.clearTimeout(timeoutId)
            }
        }, [message, duration])

        if (!visibleMessage) {
            return null
        }
    

    return (
        <div className={ok ? 'success-message' : 'error-message'}>
            {visibleMessage}
        </div>
    )
    
}