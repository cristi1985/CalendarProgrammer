'use client'

import { useFormState } from 'react-dom'
import { initialActionState } from '@/lib/action-state'
import { createRoomAction, deleteRoomAction } from './actions'
import { useEffect, useRef } from 'react'

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

  useEffect(() => {
    if (createState.ok) {
      createFormRef.current?.reset()
    }
  }, [createState])

  return (
    <div className="stack">
      {createState.message && (
        <div className={createState.ok ? 'success-message' : 'error-message'}>
          {createState.message}
        </div>
      )}

      {deleteState.message && (
        <div className={deleteState.ok ? 'success-message' : 'error-message'}>
          {deleteState.message}
        </div>
      )}

      <section className="stack">
        <h2 className="section-title">Create room</h2>

        <form ref={createFormRef} action={createFormAction} className="stack">
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
