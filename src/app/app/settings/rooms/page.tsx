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
    <div className="stack">
      <div>
        <h1 className="page-title">Rooms</h1>
      </div>

      <section className="stack">
        <h2 className="section-title">Create room</h2>

        <form action={createRoom} className="stack">
          <div className="form-grid">
            <input
              className="input"
              name="name"
              placeholder="Room name"
              required
            />
          </div>

          <div>
            <button className="button" type="submit">
              Add room
            </button>
          </div>
        </form>
      </section>

      <section className="stack">
        <h2 className="section-title">Existing rooms</h2>

        <div className="card-list">
          {rooms.map((room) => (
            <div key={room.id} className="card-item">
              <strong>{room.name}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
