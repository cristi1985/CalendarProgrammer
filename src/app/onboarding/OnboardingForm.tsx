'use client'

import { useFormState } from 'react-dom'
import { initialActionState } from '@/lib/action-state'
import { createWorkspaceAction } from './actions'

export function OnboardingForm() {
  const [state, formAction] = useFormState(
    createWorkspaceAction,
    initialActionState
  )

  return (
    <div className="stack">
      {state.message && (
        <div className={state.ok ? 'success-message' : 'error-message'}>
          {state.message}
        </div>
      )}

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
