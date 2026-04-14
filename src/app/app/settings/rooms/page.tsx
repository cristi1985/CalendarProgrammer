import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createRoom } from './actions'

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
    <div>
      <h1>Rooms</h1>

      <h2>Create room</h2>

      <form action={createRoom}>
        <input
          name="name"
          placeholder="Room name"
          required
        />
        <button type="submit">Add room</button>
      </form>

      <hr />

      <h2>Existing rooms</h2>

      <ul>
        {rooms.map((room) => (
          <li key={room.id}>{room.name}</li>
        ))}
      </ul>
    </div>
  )
}
