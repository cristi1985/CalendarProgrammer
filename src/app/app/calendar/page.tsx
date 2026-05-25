import Link from 'next/link'
import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import {
  buildHourSlots,
  buildMonthDates,
  buildWeekDates,
  formatDateForInput,
  formatTimeForCalendar,
  getCalendarRange,
  getMinutesSinceMidnight,
  isSameCalendarDay,
  zonedDateTimeToDate,
} from '@/lib/calendar'
import { redirect } from 'next/navigation'
import { CalendarFilters } from './CalendarFilters'

type SearchParams = {
  view?: string
  date?: string
  roomId?: string
}

function parseView(view?: string) {
  if (view === 'week' || view === 'month') return view
  return 'day'
}

function parseDate(date: string | undefined, timeZone: string) {
 const dateString = date || formatDateForInput(new Date(), timeZone)

  try {
    return zonedDateTimeToDate(dateString, '12:00', timeZone)
  } catch {
    return zonedDateTimeToDate(formatDateForInput(new Date(), timeZone), '12:00', timeZone)
  }
}

function formatTime(date: Date, timeZone: string) {
  return formatTimeForCalendar(date, timeZone)
}

function getBookingTopAndHeight(startAt: Date, endAt: Date, timeZone: string) {
  const startMinutes = getMinutesSinceMidnight(startAt, timeZone)
  const endMinutes = getMinutesSinceMidnight(endAt, timeZone)
  const calendarStartMinutes = 8 * 60
  const pixelsPerMinute = 40 / 30

  const top = Math.max(0, startMinutes - calendarStartMinutes) * pixelsPerMinute
  const height = Math.max(28, (endMinutes - startMinutes) * pixelsPerMinute)

  return { top, height }
}

function buildCreateBookingHref(roomId: string, date: Date, hour: string, timeZone: string
) {
  const dateStr = formatDateForInput(date, timeZone)
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
  const timeZone = result.tenantUser.tenant.timezone || 'Europe/Bucharest'
  const view = parseView(searchParams.view)
  const baseDate = parseDate(searchParams.date, timeZone)
  const range = getCalendarRange(view, baseDate, timeZone)
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

  console.log({
  timeZone,
  baseDate,
  range,
  bookings: bookings.map((booking) => ({
    id: booking.id,
    roomId: booking.roomId,
    startAt: booking.startAt,
    endAt: booking.endAt,
    sameDay: isSameCalendarDay(new Date(booking.startAt), baseDate, timeZone),
  })),
})

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Calendar</h1>

        <CalendarFilters view={view} date={formatDateForInput(baseDate,timeZone)} roomId={searchParams.roomId ??''} rooms={allRooms} />
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
                    height: 40,
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
                  isSameCalendarDay(new Date(booking.startAt), baseDate, timeZone)
              )
              console.log({
                room: {
                  id: room.id,
                  name: room.name,
                },
                roomBookings: roomBookings.map((booking) => ({
                  id: booking.id,
                  roomId: booking.roomId,
                  startAt: booking.startAt,
                  endAt: booking.endAt,
                })),
              })

              return (
                <div
                  key={room.id}
                  className="calendar-day-column"
                  style={{
                    position: 'relative',
                    height: hourSlots.length * 40,
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  {hourSlots.map((slot) => (
                    <div
                      key={slot}
                      style={{
                        height: 40,
                        borderBottom: '1px solid var(--border)',
                        padding: 4,
                      }}
                    >
                      <Link
                        className="muted"
                        href={buildCreateBookingHref(room.id, baseDate, slot, timeZone)}
                        style={{ fontSize: 12 }}
                      >
                        + Add at {slot}
                      </Link>
                    </div>
                  ))}

                  {roomBookings.map((booking) => {
                    const { top, height } = getBookingTopAndHeight(
                      new Date(booking.startAt),
                      new Date(booking.endAt),
                      timeZone
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
                          <strong>{booking.clientName || booking.user.fullName}</strong>
                        </div>
                        <div className="muted">Booked by {booking.user.fullName}</div>
                        <div>
                          {formatTimeForCalendar(new Date(booking.startAt), timeZone)} -{' '}
                          {formatTimeForCalendar(new Date(booking.endAt), timeZone)}
                        </div>
                        <div>{booking.type}</div>
                        <div className="inline-actions">
                          <Link href={buildEditBookingHref(booking.id)}>Edit / Cancel</Link>
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
                      isSameCalendarDay(new Date(booking.startAt), day, timeZone)
                    )
                    .map((booking) => (
                      <div key={booking.id} className="booking-chip">
                        <div>
                          <strong>{booking.room.name}</strong>
                        </div>
                        <div>{booking.clientName || booking.user.fullName}</div>
                        <div>
                          {formatTime(new Date(booking.startAt), timeZone)} -{' '}
                          {formatTime(new Date(booking.endAt), timeZone)}
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
                      isSameCalendarDay(new Date(booking.startAt), day, timeZone)
                    )
                    .map((booking) => (
                      <div key={booking.id} className="booking-chip">
                        <div>
                          <strong>{booking.room.name}</strong>
                        </div>
                        <div>{booking.clientName || booking.user.fullName}</div>
                        <div>{formatTime(new Date(booking.startAt), timeZone)}</div>
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