'use client'

import Link from "next/link"
import { useRef } from "react"

type Room = {
    id:string
    name: string
}

type CalendarFiltersProps = {
    view: string
    date: string
    roomId: string
    rooms: Room[]
}

export function CalendarFilters({ view, date, roomId, rooms }: CalendarFiltersProps) {
    const fromRef = useRef<HTMLFormElement>(null)

    function submitForm(){
        fromRef.current?.requestSubmit()
    }

    return(
        <form ref={fromRef} method="get" className="calendar-toolbar">
            <select className="select" name="view" defaultValue={view} onChange={submitForm}>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
            </select>

            <input className="input" type="date" name="date" defaultValue={date} onChange={submitForm} />
            <select className="select" name="roomId" defaultValue={roomId} onChange={submitForm}>
                <option value="">All rooms</option>
                {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                        {room.name}
                    </option>
                ))}
            </select>
            <Link className="nav-link" href="/app/bookings">
                Manage Bookings
            </Link>
        </form>
    )
}