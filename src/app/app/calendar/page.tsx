import Link from 'next/link'
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
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
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

function buildCreateBookingHref(roomId: string, date: Date, hour: string) {
  const dateStr = formatDateForInput(date)
  return `/app/bookings?roomId=${roomId}&startAt=${dateStr}T${hour}`
}

function buildEditBookingHref(bookingId: string) {
  return `/app/bookings?editBookingId=${bookingId}`
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

  const allRooms = await db.room.findMany({
    where: {
      tenantId: result.tenantUser.tenantId,
    },
    orderBy: { name: 'asc' },
  })

  const rooms = searchParams.roomId
    ? allRooms.filter((room) => room.id === searchParams.roomId)
    : allRooms

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
    <div className="stack">
      <div>
        <h1 className="page-title">Calendar</h1>

        <form method="get" className="calendar-toolbar">
          <select className="select" name="view" defaultValue={view}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>

          <input
            className="input"
            name="date"
            type="date"
            defaultValue={formatDateForInput(baseDate)}
          />

          <select className="select" name="roomId" defaultValue={searchParams.roomId ?? ''}>
            <option value="">All rooms</option>
            {allRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>

          <button className="button" type="submit">
            Apply
          </button>

          <Link className="nav-link" href="/app/bookings">
            Manage bookings
          </Link>
        </form>
      </div>

      {view === 'day' && (
        <div className="calendar-scroll">
          <div
            className="calendar-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: `80px repeat(${rooms.length || 1}, minmax(240px, 1fr))`,
              gap: 12,
              alignItems: 'start',
            }}
          >
            <div />
            {rooms.map((room) => (
              <div key={room.id} className="card-item">
                <strong>{room.name}</strong>
              </div>
            ))}

            <div>
              {hourSlots.map((slot) => (
                <div
                  key={slot}
                  style={{
                    height: 60,
                    borderBottom: '1px solid var(--border)',
                    fontSize: 12,
                    color: 'var(--muted)',
                    paddingTop: 4,
                  }}
                >
                  {slot}
                </div>
              ))}
            </div>

            {rooms.map((room) => {
              const roomBookings = bookings.filter(
                (booking) =>
                  booking.roomId === room.id &&
                  isSameCalendarDay(new Date(booking.startAt), baseDate)
              )

              return (
                <div
                  key={room.id}
                  className="calendar-day-column"
                  style={{
                    position: 'relative',
                    height: hourSlots.length * 60,
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  {hourSlots.map((slot) => (
                    <div
                      key={slot}
                      style={{
                        height: 60,
                        borderBottom: '1px solid var(--border)',
                        padding: 4,
                      }}
                    >
                      <Link
                        className="muted"
                        href={buildCreateBookingHref(room.id, baseDate, slot)}
                        style={{ fontSize: 12 }}
                      >
                        + Add at {slot}
                      </Link>
                    </div>
                  ))}

                  {roomBookings.map((booking) => {
                    const { top, height } = getBookingTopAndHeight(
                      new Date(booking.startAt),
                      new Date(booking.endAt)
                    )

                    return (
                      <div
                        key={booking.id}
                        className="booking-chip"
                        style={{
                          position: 'absolute',
                          top,
                          left: 8,
                          right: 8,
                          height,
                          zIndex: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <div>
                          <strong>{booking.user.fullName}</strong>
                        </div>
                        <div>
                          {formatTime(new Date(booking.startAt))} -{' '}
                          {formatTime(new Date(booking.endAt))}
                        </div>
                        <div>{booking.type}</div>
                        <div className="inline-actions" style={{ marginTop: 6 }}>
                          <Link href={buildEditBookingHref(booking.id)}>Edit / cancel</Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div className="calendar-scroll">
          <div
            className="calendar-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {buildWeekDates(baseDate).map((day) => (
              <div key={day.toISOString()} className="calendar-week-cell card-item">
                <div style={{ marginBottom: 8 }}>
                  <strong>{formatDateForInput(day)}</strong>
                </div>

                <div className="card-list">
                  {bookings
                    .filter((booking) =>
                      isSameCalendarDay(new Date(booking.startAt), day)
                    )
                    .map((booking) => (
                      <div key={booking.id} className="booking-chip">
                        <div>
                          <strong>{booking.room.name}</strong>
                        </div>
                        <div>{booking.user.fullName}</div>
                        <div>
                          {formatTime(new Date(booking.startAt))} -{' '}
                          {formatTime(new Date(booking.endAt))}
                        </div>
                        <div className="inline-actions" style={{ marginTop: 6 }}>
                          <Link href={buildEditBookingHref(booking.id)}>Edit / cancel</Link>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'month' && (
        <div className="calendar-scroll">
          <div
            className="calendar-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(160px, 1fr))',
              gap: 12,
            }}
          >
            {buildMonthDates(baseDate).map((day) => (
              <div key={day.toISOString()} className="calendar-month-cell card-item">
                <div style={{ marginBottom: 8 }}>
                  <strong>{day.getDate()}</strong>
                </div>

                <div className="card-list">
                  {bookings
                    .filter((booking) =>
                      isSameCalendarDay(new Date(booking.startAt), day)
                    )
                    .map((booking) => (
                      <div key={booking.id} className="booking-chip">
                        <div>
                          <strong>{booking.room.name}</strong>
                        </div>
                        <div>{formatTime(new Date(booking.startAt))}</div>
                        <div className="inline-actions" style={{ marginTop: 6 }}>
                          <Link href={buildEditBookingHref(booking.id)}>Edit</Link>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}