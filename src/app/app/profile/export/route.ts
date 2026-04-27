import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { NextResponse } from 'next/server'

function getSelectedMonth(month?: string) {
  if (!month) {
    return new Date()
  }

  const parsed = new Date(`${month}-01T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }

  return parsed
}

function getMonthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  end.setHours(0, 0, 0, 0)

  return { start, end }
}

function getHours(startAt: Date, endAt: Date) {
  return (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60)
}

function escapeCSV(value: string | number | boolean) {
  const stringValue = String(value).replace(/"/g, '""')
  return `"${stringValue}"`
}

function formatMonthFileValue(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
}

function textResponse(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

export async function GET(request: Request) {
  try {
    const result = await syncAuthenticatedUser()

    if (!result || !result.tenantUser) {
      return textResponse('Please sign in to export this report.', 401)
    }

    if (result.tenantUser.role !== 'owner') {
      return textResponse('Only workspace owners can export this report.', 403)
    }

    const { searchParams } = new URL(request.url)
    const selectedMonthDate = getSelectedMonth(searchParams.get('month') ?? undefined)
    const { start, end } = getMonthBounds(selectedMonthDate)

    const tenantUsers = await db.tenantUser.findMany({
      where: {
        tenantId: result.tenantUser.tenantId,
      },
      include: {
        user: true,
      },
      orderBy: {
        user: {
          fullName: 'asc',
        },
      },
    })

    const bookings = await db.booking.findMany({
      where: {
        tenantId: result.tenantUser.tenantId,
        startAt: { gte: start },
        endAt: { lt: end },
      },
      orderBy: { startAt: 'asc' },
    })

    const rows = tenantUsers.map((tenantUser) => {
      const userBookings = bookings.filter(
        (booking) => booking.userId === tenantUser.userId
      )
      const totalHours = userBookings.reduce(
        (sum, booking) => sum + getHours(booking.startAt, booking.endAt),
        0
      )

      return {
        name: tenantUser.user.fullName,
        email: tenantUser.user.email,
        hours: totalHours % 1 === 0 ? totalHours.toFixed(0) : totalHours.toFixed(2),
        isPermanent: tenantUser.isPermanent ? 'Yes' : 'No',
        bookingsCount: userBookings.length,
      }
    })

    const header = ['Name', 'Email', 'Hours Booked', 'Permanent User', 'Bookings Count']

    const csvLines = [
      header.map(escapeCSV).join(','),
      ...rows.map((row) =>
        [row.name, row.email, row.hours, row.isPermanent, row.bookingsCount]
          .map(escapeCSV)
          .join(',')
      ),
    ]

    const csvContent = csvLines.join('\n')
    const monthValue = formatMonthFileValue(selectedMonthDate)

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bookings_${monthValue}.csv"`,
      },
    })
  } catch (error) {
    console.error('Failed to export CSV report', error)

    return textResponse(
      'Could not export the CSV report. Please try again.',
      500
    )
  }
}
