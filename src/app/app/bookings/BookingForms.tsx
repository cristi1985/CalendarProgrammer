'use client'

import { useFormState } from "react-dom"
import { initialActionState } from "@/lib/action-state"
import { createBookingAction } from "./actions"
import { cancelBookingAction, updateBookingAction } from "./manage-actions"
import { AutoDismissMessage } from "@/components/AutoDismissMessage"
import { formatDateForDisplay, formatTimeForCalendar } from "@/lib/calendar"

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

function addOneHourToTime(time: string) {
  const [hoursValue, minutesValue] = time.split(':')
  const hour = Number(hoursValue)
  const minute = Number(minutesValue)

  if(Number.isNaN(hour) || Number.isNaN(minute)) {
    return null
  }

  return `${(hour+1).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

function getDateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  )
}

function toDateInputValue(date: Date, timeZone: string) {
  const parts = getDateTimeParts(date, timeZone)

  return `${parts.year}-${parts.month}-${parts.day}`
}

function toTimeInputValue(date: Date, timeZone: string) {
  const parts = getDateTimeParts(date, timeZone)

  return `${parts.hour}:${parts.minute}`
}

function formatBookingDateTime(date: Date, timeZone: string) {
  return `${formatDateForDisplay(date, timeZone)} ${formatTimeForCalendar(date, timeZone)}`
}

function formatBookingTimeRange(startAt: Date, endAt: Date, timeZone: string) {
  return `${formatDateForDisplay(startAt, timeZone)} ${formatTimeForCalendar(startAt, timeZone)} → ${formatTimeForCalendar(endAt, timeZone)}`
}
export function BookingForms({
  rooms,
  bookings,
  selectedBooking,
  initialBookingValues,
  timezone,
}: {
  rooms: Room[]
  bookings: Booking[]
  selectedBooking: Booking | null
  initialBookingValues: InitialBookingValues
  timezone: string
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
  const recentBookings = selectedBooking ? bookings.filter((booking)=> booking.id !== selectedBooking.id) : bookings
  const renderBookingCard = (booking:Booking) =>(
    <div key={booking.id} className="card-item">
    <div style={{ marginBottom: 8 }}>
      <strong>{booking.room.name}</strong> — {booking.clientName} booked by{' '}
      {booking.user.fullName}
    </div>

    <div className="muted" style={{ marginBottom: 8 }}>
      {formatBookingTimeRange(
        new Date(booking.startAt),
        new Date(booking.endAt),
        timezone
      )}
    </div>

    <div style={{ marginBottom: 12 }}>Type: {booking.type}</div>

    <details open={selectedBooking?.id === booking.id}>
      <summary>Edit booking</summary>

      <form
        action={updateFormAction}
        className="stack"
        style={{ marginTop: 12 }}
      >
        <input type="hidden" name="bookingId" value={booking.id} />

        <div>
          <label
            className="muted"
            htmlFor={`clientName-${booking.id}`}
          >
            Client name
          </label>

          <input
            id={`clientName-${booking.id}`}
            className="input"
            name="clientName"
            defaultValue={booking.clientName ?? ''}
            required
          />
        </div>

        <div className="form-grid">
          <select
            className="select"
            name="roomId"
            defaultValue={booking.roomId}
          >
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
              defaultValue={toDateInputValue(
                new Date(booking.startAt),
                timezone
              )}
              required
            />
          </div>

          <div>
            <label className="muted">Start time</label>
            <select
              className="select"
              name="startTime"
              defaultValue={toTimeInputValue(
                new Date(booking.startAt),
                timezone
              )}
              required
              onChange={(event) => {
                const endTime = addOneHourToTime(
                  event.currentTarget.value
                )

                const endTimeSelect =
                  event.currentTarget.form?.elements.namedItem(
                    'endTime'
                  ) as HTMLSelectElement | null

                if (
                  endTime &&
                  timeOptions.includes(endTime) &&
                  endTimeSelect
                ) {
                  endTimeSelect.value = endTime
                }
              }}
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
              defaultValue={toTimeInputValue(
                new Date(booking.endAt),
                timezone
              )}
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
      <input type="hidden" name="bookingId" value={booking.id} />

      <button className="secondary" type="submit">
        Cancel booking
      </button>
    </form>
  </div>
  )
  return (
  

    <div className="stack">
      <AutoDismissMessage message={createState.message} ok={createState.ok} id={createState.id} />
      <AutoDismissMessage message={updateState.message} ok={updateState.ok} id={updateState.id} />
      <AutoDismissMessage message={cancelState.message} ok={cancelState.ok} id={cancelState.id} />

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
              <select className="select" name="startTime" defaultValue={initialBookingValues.startTime} required
              onChange={(event) => {
                const endTime = addOneHourToTime(event.currentTarget.value)
                const endTimeSelect = event.currentTarget.form?.elements.namedItem('endTime') as HTMLSelectElement | null
                if(endTime && timeOptions.includes(endTime) && endTimeSelect) {
                  endTimeSelect.value = endTime
                }
              }}>
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

      {selectedBooking && (
          <section className="stack">
            <h2 className="section-title">Selected Booking</h2>

            <div className="card-list">
              {renderBookingCard(selectedBooking)}
            </div>
          </section>
      )}

      <section className="stack">
        <h2 className="section-title">Recent bookings</h2>

        

        <div className="card-list">
          {bookings.map((b) => (
            <div key={b.id} className="card-item">
              <div style={{ marginBottom: 8 }}>
                <strong>{b.room.name}</strong> — {b.clientName} booked by {b.user.fullName}
              </div>
              <div className="muted" style={{ marginBottom: 8 }}>
                {formatBookingTimeRange(new Date(b.startAt), new Date(b.endAt), timezone)}
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
                        defaultValue={toDateInputValue(new Date(b.startAt), timezone)}
                        required
                      />
                    </div>

                    <div>
                      <label className="muted">Start time</label>
                      <select
                        className="select"
                        name="startTime"
                        defaultValue={toTimeInputValue(new Date(b.startAt), timezone)}
                        required
                        onChange={(event) => {
                          const endTime = addOneHourToTime(event.currentTarget.value)
                          const endTimeSelect = event.currentTarget.form?.elements.namedItem('endTime') as HTMLSelectElement | null
                          if(endTime && timeOptions.includes(endTime) && endTimeSelect) {
                            endTimeSelect.value = endTime
                          }
                        }}>
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
                        defaultValue={toTimeInputValue(new Date(b.endAt), timezone)}
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
