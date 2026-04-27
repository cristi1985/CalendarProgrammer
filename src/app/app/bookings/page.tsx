import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { buildTimeOptions
 } from '@/lib/booking-rules'
 import{BookingForms} from './BookingForms'

export default async function BookingsPage() {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
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

      <BookingForms rooms={rooms} bookings={bookings} />
    </div>
  )
  
}
