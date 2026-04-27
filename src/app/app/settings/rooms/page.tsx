import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RoomForms } from './RoomForms'

export default async function RoomsPage() {
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

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Rooms</h1>
      </div>

      <RoomForms rooms={rooms} />
    </div>
  )
}
