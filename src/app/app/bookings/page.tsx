import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
 import{BookingForms} from './BookingForms'

type SearchParams = {
  roomId?: string
  startAt?: string
  editBookingId?: string
}


function addOneHour(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const next = new Date()
  next.setHours(hours + 1, minutes, 0, 0)
  return next.toTimeString().slice(0, 5)
}

function getInitialBookingValues(searchParams: SearchParams) {
  const startAt = searchParams.startAt
  if(!startAt) {
    return {
      roomId: searchParams.roomId ?? '',
      date: '',
      startTime: '08:00',
      endTime: '09:00'
    }
  }

  const[date, time] = startAt.split('T')
  const startTime = time.slice(0, 5) ?? ''

  return{
    roomId: searchParams.roomId ?? '',
    date: date ?? '',
    startTime,
    endTime: addOneHour(startTime)
  }
}
export default async function BookingsPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (!result.tenantUser) {
    redirect('/onboarding')
  }

  
  const initialBookingValues = getInitialBookingValues(searchParams)
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
      tenant:{
        select: {
          timezone: true
        }
      }
    },
  })

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Bookings</h1>
      </div>

      <BookingForms rooms={rooms} bookings={bookings} initialBookingValues={initialBookingValues} />
    </div>
  )
  
}
