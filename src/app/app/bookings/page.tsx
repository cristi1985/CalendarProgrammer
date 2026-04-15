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
    <div>
      <h1>Bookings</h1>

      <h2>Create booking</h2>

      <form action={createBooking}>
        <select name="roomId" required>
          <option value="">Select room</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>

        <select name="type" defaultValue="hourly">
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
        </select>

        <div>
          <label>Start</label>
          <input type="datetime-local" name="startAt" required />
        </div>

        <div>
          <label>End</label>
          <input type="datetime-local" name="endAt" required />
        </div>

        <h3>Recurrence</h3>

        <select name="recurrence" defaultValue="none">
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>

        <div>
          <label>Repeat until</label>
          <input type="date" name="recurrenceUntil" />
        </div>

        <button type="submit">Create booking</button>
      </form>

      <hr />

      <h2>Recent bookings</h2>

      <ul>
         {bookings.map((b) => (
          <li key={b.id} style={{ marginBottom: 24 }}>
            <div>
              <strong>{b.room.name}</strong> — {b.user.fullName}
            </div>

            <div>
              {new Date(b.startAt).toLocaleString()} →{' '}
              {new Date(b.endAt).toLocaleString()}
            </div>

            <div>Type: {b.type}</div>

            {/* EDIT */}
            <details>
              <summary>Edit booking</summary>
              <form action={updateBooking}>
                <input type="hidden" name="bookingId" value={b.id} />

                <select name="roomId" defaultValue={b.roomId}>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>

                <div>
                  <label>Start</label>
                  <input
                    type="datetime-local"
                    name="startAt"
                    defaultValue={toDateTimeLocalValue(new Date(b.startAt))}
                  />
                </div>

                <div>
                  <label>End</label>
                  <input
                    type="datetime-local"
                    name="endAt"
                    defaultValue={toDateTimeLocalValue(new Date(b.endAt))}
                  />
                </div>

                <button type="submit">Save</button>
              </form>
            </details>

            {/* CANCEL */}
            <form action={cancelBooking}>
              <input type="hidden" name="bookingId" value={b.id} />
              <button type="submit">Cancel booking</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  )
}
