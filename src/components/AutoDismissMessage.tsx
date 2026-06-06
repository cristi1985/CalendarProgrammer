'use client'

import { useEffect, useState } from "react"

type AutoDismissMessageProps = {
    message?: string | null
    ok: boolean
    id?: number
    duration?: number
}

export function AutoDismissMessage({
     message,
     ok,
     id,
     duration = 5000,
     }: AutoDismissMessageProps) {
    const [visibleMessage, setVisibleMessage] = useState<string | null>(null)

    useEffect(() => {
        if(!message) {
            setVisibleMessage(null)
            return
        }
        setVisibleMessage(message)
        

        const timeoutId = window.setTimeout(() => {
            setVisibleMessage(null)
        }, duration)

        return () => {
            window.clearTimeout(timeoutId)
            }
        }, [message, id, duration])

        if (!visibleMessage) {
            return null
        }
    

    return (
        <div className="toast-container">
            <div className={ok ? 'toast-message toast-success' : 'toast-message toast-error'}>
            {visibleMessage}
            </div>
        </div>
    )
    
}