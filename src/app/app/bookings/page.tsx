import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createBooking } from './actions'
import { cancelBooking, updateBooking } from './manage-actions'

function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0')

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default async function BookingsPage() {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  function buildTimeOptions() {
    const options: string[] = []

    for (let hour = 8; hour < 21; hour++) {
       options.push(`${hour.toString().padStart(2, '0')}:00`)
       options.push(`${hour.toString().padStart(2, '0')}:30`)
      }
    options.push('21:00')

    return options
  }

  const timeOptions = buildTimeOptions()

  const rooms = await db.room.findMany({
    where: {
      tenantId: result.tenantUser.tenantId,
    },
    orderBy: {
      name: 'asc',
    },
  })

  const bookings = await db.booking.findMany({
    where: {
      tenantId: result.tenantUser.tenantId,
    },
    orderBy: {
      startAt: 'desc',
    },
    take: 20,
    include: {
      room: true,
      user: true,
    },
  })

  return (
     <div className="stack">
      <div>
        <h1 className="page-title">Bookings</h1>
      </div>

      <section className="stack">
        <h2 className="section-title">Create booking</h2>

        <form action={createBooking} className="stack">
          <div className="form-grid">
            <select className="select" name="roomId" required>
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>

            <select className="select" name="type" defaultValue="hourly">
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
            </select>
          </div>

          <div className="form-grid">
            <div>
              <label className="muted">Date</label>
              <input className="input" type="date" name="date" required />
            </div>

            <div>
              <label className="muted">Start time</label>
              <select className="select" name="startTime" required>
                <option value="">Select start time</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="muted">End time</label>
              <select className="select" name="endTime" required>
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
                {new Date(b.startAt).toLocaleString()} →{' '}
                {new Date(b.endAt).toLocaleString()}
              </div>

              <div style={{ marginBottom: 12 }}>Type: {b.type}</div>

              <details>
                <summary>Edit booking</summary>

                <form action={updateBooking} className="stack" style={{ marginTop: 12 }}>
                  <input type="hidden" name="bookingId" value={b.id} />

                  <div className="form-grid">
                    <select className="select" name="roomId" defaultValue={b.roomId}>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>

                    <div />
                  </div>

                  <div className="form-grid">
                    <div>
                      <label className="muted">Date</label>
                      <input className="input" type="date" name="date" required />
                    </div>

                    <div>
                      <label className="muted">Start time</label>
                      <select className="select" name="startTime" required>
                        <option value="">Select start time</option>
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="muted">End time</label>
                      <select className="select" name="endTime" required>
                        <option value="">Select end time</option>
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

              <form action={cancelBooking} style={{ marginTop: 12 }}>
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
