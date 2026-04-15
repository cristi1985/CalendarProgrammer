import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import {
  buildHourSlots,
  buildMonthDates,
  buildWeekDates,
  formatDateForInput,
  getCalendarRange,
  isSameCalendarDay,
} from '@/lib/calendar'
import { redirect } from 'next/navigation'
import Link from 'next/link'


function buildCreateBookingHref(roomId: string, date: Date, hour: string) {
  const dateStr = formatDateForInput(date)
  return `/app/bookings?roomId=${roomId}&startAt=${dateStr}T${hour}`
}

function buildEditBookingHref(bookingId: string) {
  return `/app/bookings?editBookingId=${bookingId}`
}

type SearchParams = {
  view?: string
  date?: string
  roomId?: string
}

function parseView(view?: string) {
  if (view === 'week' || view === 'month') return view
  return 'day'
}

function parseDate(date?: string) {
  if (!date) return new Date()
  return new Date(`${date}T00:00:00`)
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const result = await syncAuthenticatedUser()

  if (!result) redirect('/signin')
  if (!result.tenantUser) redirect('/onboarding')

  const view = parseView(searchParams.view)
  const baseDate = parseDate(searchParams.date)
  const range = getCalendarRange(view, baseDate)
  const hourSlots = buildHourSlots()

  const rooms = await db.room.findMany({
    where: {
      tenantId: result.tenantUser.tenantId,
      ...(searchParams.roomId ? { id: searchParams.roomId } : {}),
    },
    orderBy: { name: 'asc' },
  })

  const bookings = await db.booking.findMany({
    where: {
      tenantId: result.tenantUser.tenantId,
      startAt: { lt: range.end },
      endAt: { gt: range.start },
      ...(searchParams.roomId ? { roomId: searchParams.roomId } : {}),
    },
    include: { room: true, user: true },
    orderBy: { startAt: 'asc' },
  })

  return (
    <div>
      <h1>Calendar</h1>

      {/* Controls */}
      <form method="get" style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <select name="view" defaultValue={view}>
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>

        <input
          name="date"
          type="date"
          defaultValue={formatDateForInput(baseDate)}
        />

        <select name="roomId" defaultValue={searchParams.roomId ?? ''}>
          <option value="">All rooms</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>

        <button type="submit">Apply</button>
      </form>

      {/* DAY VIEW */}
      {view === 'day' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `80px repeat(${rooms.length || 1}, minmax(220px, 1fr))`,
            gap: 12,
            alignItems: 'start',
          }}
        >
          <div />
          {rooms.map((room) => (
            <div key={room.id}>
              <strong>{room.name}</strong>
            </div>
          ))}

          <div>
            {hourSlots.map((slot) => (
              <div
                key={slot}
                style={{
                  height: 72,
                  borderBottom: '1px solid #eee',
                  fontSize: 12,
                }}
              >
                {slot}
              </div>
            ))}
          </div>

          {rooms.map((room) => {
            const roomBookings = bookings.filter(
              (b) =>
                b.roomId === room.id &&
                isSameCalendarDay(new Date(b.startAt), baseDate)
            )

            return (
              <div
                key={room.id}
                style={{
                  position: 'relative',
                  border: '1px solid #ddd',
                  height: hourSlots.length * 72,
                }}
              >
                {hourSlots.map((slot) => (
                  <div
                    key={slot}
                    style={{
                      height: 72,
                      borderBottom: '1px solid #eee',
                      padding: 4,
                      boxSizing: 'border-box',
                    }}
                  >
                    <Link href={buildCreateBookingHref(room.id, baseDate, slot)}>
                      + Add at {slot}
                    </Link>
                  </div>
                ))}

                {roomBookings.map((b) => {
                  const start = new Date(b.startAt)
                  const end = new Date(b.endAt)

                  const startMinutes = start.getHours() * 60 + start.getMinutes()
                  const endMinutes = end.getHours() * 60 + end.getMinutes()
                  const dayStartMinutes = 8 * 60
                  const pixelsPerMinute = 72 / 60

                  const top = (startMinutes - dayStartMinutes) * pixelsPerMinute
                  const height = Math.max(
                    36,
                    (endMinutes - startMinutes) * pixelsPerMinute
                  )

                  return (
                    <div
                      key={b.id}
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
                        zIndex: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <div>
                        <strong>{b.user.fullName}</strong>
                      </div>
                      <div>
                        {formatTime(start)} - {formatTime(end)}
                      </div>
                      <div>{b.type}</div>
                      <Link href={buildEditBookingHref(b.id)}>Edit / cancel</Link>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12 }}>
          {buildWeekDates(baseDate).map((day) => (
            <div key={day.toISOString()} style={{ border: '1px solid #ddd', padding: 8 }}>
              <strong>{formatDateForInput(day)}</strong>

              {bookings
                .filter((b) =>
                  isSameCalendarDay(new Date(b.startAt), day)
                )
                .map((b) => (
                  <div key={b.id}>
                    {b.room.name} — {formatTime(new Date(b.startAt))}
                    <Link href={buildEditBookingHref(b.id)}>
                      Edit / cancel
                    </Link>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12 }}>
          {buildMonthDates(baseDate).map((day) => (
            <div key={day.toISOString()} style={{ border: '1px solid #ddd', padding: 8 }}>
              <strong>{day.getDate()}</strong>

              {bookings
                .filter((b) =>
                  isSameCalendarDay(new Date(b.startAt), day)
                )
                .map((b) => (
                  <div key={b.id}>
                    {b.room.name} — {formatTime(new Date(b.startAt))}
                    <Link href={buildEditBookingHref(b.id)}>
                      Edit
                    </Link>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}