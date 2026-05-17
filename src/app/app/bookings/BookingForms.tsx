'use client'

import { useFormState } from "react-dom"
import { initialActionState } from "@/lib/action-state"
import { createBookingAction } from "./actions"
import { cancelBookingAction, updateBookingAction } from "./manage-actions"
import { AutoDismissMessage } from "@/components/AutoDismissMessage"

type Room = {
  id: string
  name: string
}

type Booking = {
    id: string
    roomId: string
    clientName: string | null
    startAt: Date
    endAt: Date
    type:string
    room:{
        name: string
    }
    user:{
        fullName: string
    }
    tenant:{
        timezone: string | null
    } 
}

type InitialBookingValues = {
  roomId: string
  date: string
  startTime: string
  endTime: string
}

function buildTimeOptions() {
  const options:string[] = []

  for(let hour= 8; hour < 21; hour++) {
    options.push(`${hour.toString().padStart(2, '0')}:00`)
    options.push(`${hour.toString().padStart(2, '0')}:30`)
  }
  options.push('21:00')

  return options
}


function toDateInputValue(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function toTimeInputValue(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function BookingForms({
  rooms,
  bookings,
  initialBookingValues
}: {
  rooms: Room[]
  bookings: Booking[]
  initialBookingValues: InitialBookingValues
}) {
  const timeOptions = buildTimeOptions()
  const [createState, createFormAction] = useFormState(
    createBookingAction,
    initialActionState
  )
  const [updateState, updateFormAction] = useFormState(
    updateBookingAction,
    initialActionState
  )
  const [cancelState, cancelFormAction] = useFormState(
    cancelBookingAction,
    initialActionState
  )

  return (
    <div className="stack">
      <AutoDismissMessage message={createState.message} ok={createState.ok} />
      <AutoDismissMessage message={updateState.message} ok={updateState.ok} />
      <AutoDismissMessage message={cancelState.message} ok={cancelState.ok} />

      <section className="stack">
        <h2 className="section-title">Create booking</h2>

        <form action={createFormAction} className="stack">
          <div>
            <label className="muted" htmlFor="clientName">
              Client name
            </label>
            <input
              id="clientName"
              className="input"
              name="clientName"
              placeholder="Client name"
              required
            />
          </div>
          <div className="form-grid">
            <div>
               <label className="muted" htmlFor="roomId">Room</label>
               <select id="roomId" className="select" name="roomId" defaultValue={initialBookingValues.roomId} required>
                  <option value="">Select room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
                <p></p>
                <select className="select" name="type" defaultValue="hourly">
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                </select>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label className="muted">Date</label>
              <input className="input" type="date" name="date" defaultValue={initialBookingValues.date} required />
            </div>

            <div>
              <label className="muted">Start time</label>
              <select className="select" name="startTime" defaultValue={initialBookingValues.startTime} required>
                <option value="">Select start time</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
               <label className="muted">End time</label>
              <select className="select" name="endTime" defaultValue={initialBookingValues.endTime} required>
                <option value="">Select end time</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <select className="select" name="recurrence" defaultValue="none">
              <option value="none">No recurrence</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>

            <div>
              <label className="muted">Repeat until</label>
              <input className="input" type="date" name="recurrenceUntil" />
            </div>
          </div>

          <div>
            <button className="button" type="submit">
              Create booking
            </button>
          </div>
        </form>
      </section>

      <section className="stack">
        <h2 className="section-title">Recent bookings</h2>

        

        <div className="card-list">
          {bookings.map((b) => (
            <div key={b.id} className="card-item">
              <div style={{ marginBottom: 8 }}>
                <strong>{b.room.name}</strong> — {b.user.fullName}
              </div>
              <div className="muted" style={{ marginBottom: 8 }}>
                {new Date(b.startAt).toLocaleString([], { timeZone: b.tenant.timezone || 'Europe/Bucharest' })} /{' '}
                {new Date(b.endAt).toLocaleString([], { timeZone: b.tenant.timezone || 'Europe/Bucharest' })} /{' '}
              </div>

              <div style={{ marginBottom: 12 }}>Type: {b.type}</div>

              <details>
                <summary>Edit booking</summary>

                <form action={updateFormAction} className="stack" style={{ marginTop: 12 }}>
                  <input type="hidden" name="bookingId" value={b.id} />

                  <div>
                      <label className="muted" htmlFor={`clientName-${b.id}`}>
                        Client name
                      </label>
                      <input
                        id={`clientName-${b.id}`}
                        className="input"
                        name="clientName"
                        defaultValue={b.clientName ?? ''}
                        required
                      />
                    </div>

                  <div className="form-grid">
                    <select className="select" name="roomId" defaultValue={b.roomId}>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-grid">
                    <div>
                      <label className="muted">Date</label>
                      <input
                        className="input"
                        type="date"
                        name="date"
                        defaultValue={toDateInputValue(new Date(b.startAt), b.tenant.timezone || 'Europe/Bucharest')} 
                        required
                      />
                    </div>

                    <div>
                      <label className="muted">Start time</label>
                      <select
                        className="select"
                        name="startTime"
                        defaultValue={toTimeInputValue(new Date(b.startAt), b.tenant.timezone || 'Europe/Bucharest')}
                        required
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="muted">End time</label>
                      <select
                        className="select"
                        name="endTime"
                        defaultValue={toTimeInputValue(new Date(b.endAt), b.tenant.timezone || 'Europe/Bucharest')}
                        required
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="inline-actions">
                    <button className="button" type="submit">
                      Save changes
                    </button>
                  </div>
                </form>
              </details>

              <form action={cancelFormAction} style={{ marginTop: 12 }}>
                <input type="hidden" name="bookingId" value={b.id} />
                <button className="secondary" type="submit">
                  Cancel booking
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}