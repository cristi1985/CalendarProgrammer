'use client'

import { useFormState } from 'react-dom'
import { initialActionState } from '@/lib/action-state'
import { createRoomAction, deleteRoomAction } from './actions'
import { useRef } from 'react'
import { AutoDismissMessage } from '@/components/AutoDismissMessage'

type Room = {
  id: string
  name: string
}

export function RoomForms({ rooms }: { rooms: Room[] }) {
  const [createState, createFormAction] = useFormState(
    createRoomAction,
    initialActionState
  )

  const createFormRef = useRef<HTMLFormElement>(null)
  

  const [deleteState, deleteFormAction] = useFormState(
    deleteRoomAction,
    initialActionState
  )

  async function handleCreateAction(formData: FormData) {
    await createFormAction(formData)
    createFormRef.current?.reset()
  }

  return (
    <div className="stack">
      <AutoDismissMessage message={createState.message} ok={createState.ok} id={createState.id} />
      <AutoDismissMessage message={deleteState.message} ok={deleteState.ok} id={deleteState.id} />

      <section className="stack">
        <h2 className="section-title">Create room</h2>

        <form ref={createFormRef} action={handleCreateAction} className="stack">
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
            <div
              key={room.id}
              className="card-item"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <strong>{room.name}</strong>

              <form action={deleteFormAction}>
                <input type="hidden" name="roomId" value={room.id} />
                <button className="secondary" type="submit">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
