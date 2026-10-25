'use client'

import { useEffect, useState } from "react"

type AutoDismissMessageProps = {
    message?: string | null
    ok: boolean
    id?: number
    duration?: number
}


function TimedMessage({
  message,
  ok,
  duration,
}: {
  message: string
  ok: boolean
  duration: number
}) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDismissed(true)
    }, duration)

    return () => window.clearTimeout(timeoutId)
  }, [duration])

  if (dismissed) return null

  return (
    <div className="toast-container">
      <div
        className={
          ok
            ? 'toast-message toast-success'
            : 'toast-message toast-error'
        }
      >
        {message}
      </div>
    </div>
  )
}

export function AutoDismissMessage({
     message,
     ok,
     id,
     duration = 5000,
     }: AutoDismissMessageProps) {
    if (!message)  return null

   
    

    return (
        <TimedMessage
        key= {JSON.stringify([id, message, ok, duration])}
        message={message}
        ok={ok}
        duration={duration}
        ></TimedMessage>
    )
    
}