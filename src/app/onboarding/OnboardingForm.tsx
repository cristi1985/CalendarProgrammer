'use client'

import { useFormState } from 'react-dom'
import { initialActionState } from '@/lib/action-state'
import { createWorkspaceAction } from './actions'
import { AutoDismissMessage } from '@/components/AutoDismissMessage'

export function OnboardingForm() {
  const [state, formAction] = useFormState(
    createWorkspaceAction,
    initialActionState
  )

  return (
    <div className="stack">
      <AutoDismissMessage message={state.message} ok={state.ok} id={state.id} />

      <form action={formAction} className="stack">
        <input
          className="input"
          name="name"
          placeholder="Workspace name"
          required
        />

        <button className="button" type="submit">
          Create workspace
        </button>
      </form>
    </div>
  )
}
