import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { buildHourSlots, formatDateForInput } from '@/lib/calendar'
import { redirect } from 'next/navigation'

type SearchParams = {
  date?: string
}

function getDayBounds(input?: string) {
  const base = input ? new Date(`${input}T00:00:00`) : new Date()

  const start = new Date(base)
  start.setHours(0, 0, 0, 0)

  const end = new Date(base)
  end.setHours(23, 59, 59, 999)

  return { start, end, date: base }
}

function getBookingTopAndHeight(startAt: Date, endAt: Date) {
  const startMinutes = startAt.getHours() * 60 + startAt.getMinutes()
  const endMinutes = endAt.getHours() * 60 + endAt.getMinutes()

  const calendarStartMinutes = 8 * 60
  const pixelsPerMinute = 1

  const top = Math.max(0, startMinutes - calendarStartMinutes) * pixelsPerMinute
  const height = Math.max(30, (endMinutes - startMinutes) * pixelsPerMinute)

  return { top, height }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  const { start, end, date } = getDayBounds(searchParams.date)
  const hourSlots = buildHourSlots()

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
      startAt: {
        lt: end,
      },
      endAt: {
        gt: start,
      },
    },
    include: {
      room: true,
      user: true,
    },
    orderBy: {
      startAt: 'asc',
    },
  })

  return (
    <div>
      <h1>Calendar</h1>

      <form method="get">
        <label htmlFor="date">Date</label>{' '}
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={formatDateForInput(date)}
        />
        <button type="submit">Go</button>
      </form>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `80px repeat(${rooms.length || 1}, minmax(220px, 1fr))`,
          gap: 12,
          alignItems: 'start',
          marginTop: 24,
        }}
      >
        <div />
        {rooms.map((room) => (
          <div key={room.id} style={{ fontWeight: 600 }}>
            {room.name}
          </div>
        ))}

        <div style={{ position: 'relative' }}>
          {hourSlots.map((slot, index) => (
            <div
              key={slot}
              style={{
                height: 60,
                borderTop: index === 0 ? '1px solid #ddd' : undefined,
                borderBottom: '1px solid #eee',
                fontSize: 12,
                paddingTop: 2,
              }}
            >
              {slot}
            </div>
          ))}
        </div>

        {rooms.map((room) => {
          const roomBookings = bookings.filter((booking) => booking.roomId === room.id)

          return (
            <div
              key={room.id}
              style={{
                position: 'relative',
                height: hourSlots.length * 60,
                border: '1px solid #ddd',
                background: '#fff',
              }}
            >
              {hourSlots.map((slot) => (
                <div
                  key={slot}
                  style={{
                    height: 60,
                    borderBottom: '1px solid #eee',
                  }}
                />
              ))}

              {roomBookings.map((booking) => {
                const { top, height } = getBookingTopAndHeight(
                  new Date(booking.startAt),
                  new Date(booking.endAt)
                )

                return (
                  <div
                    key={booking.id}
                    style={{
                      position: 'absolute',
                      top,
                      left: 8,
                      right: 8,
                      height,
                      background: '#e8f0fe',
                      border: '1px solid #9bb8ff',
                      borderRadius: 6,
                      padding: 8,
                      overflow: 'hidden',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{booking.user.fullName}</div>
                    <div>
                      {new Date(booking.startAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(booking.endAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div>{booking.type}</div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}