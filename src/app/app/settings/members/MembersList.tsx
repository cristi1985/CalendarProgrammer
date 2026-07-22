'use client'

import { useFormState } from 'react-dom'
import { initialActionState } from '@/lib/action-state'
import { AutoDismissMessage } from '@/components/AutoDismissMessage'
import { deleteTenantMemberAction } from './actions'

type WorkspaceMember = {
  id: string
  userId: string
  role: string
  user: {
    fullName: string
    email: string
  }
}

type MemberListProps = {
  members: WorkspaceMember[]
  currentUserId: string
  currentRole: string
}

export function MemberList({
  members,
  currentUserId,
  currentRole,
}: MemberListProps) {
  const [deleteState, deleteFormAction] = useFormState(
    deleteTenantMemberAction,
    initialActionState
  )

  return (
    <div className="stack">
      <AutoDismissMessage
        message={deleteState.message}
        ok={deleteState.ok}
        id={deleteState.id}
      />

      <section className="stack">
        <h2 className="section-title">Workspace members</h2>

        <div className="card-list">
          {members.map((member) => {
            const canDelete =
              member.userId !== currentUserId &&
              (
                (currentRole === 'owner' &&
                  member.role === 'member') ||
                (
                  currentRole === 'admin' &&
                  (
                    member.role === 'owner' ||
                    member.role === 'member'
                  )
                )
              )

            return (
              <div
                key={member.id}
                className="card-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div>
                    <strong>{member.user.fullName}</strong>
                  </div>

                  <div className="muted">
                    {member.user.email}
                  </div>

                  <div className="muted">
                    Role: {member.role}
                  </div>
                </div>

                {canDelete && (
                  <form action={deleteFormAction}>
                    <input
                      type="hidden"
                      name="tenantUserId"
                      value={member.id}
                    />

                    <button
                      className="secondary"
                      type="submit"
                    >
                      Remove member
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}