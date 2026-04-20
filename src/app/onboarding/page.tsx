import { createWorkspace } from "./actions"


export default function OnboardingPage() {
  return (
     <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Welcome</h1>
        <p className="auth-subtitle">
          You are signed in, but you do not belong to any workspace yet.
        </p>

        <h2 className="section-title">Create a workspace</h2>

        <form action={createWorkspace} className="stack">
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

        <hr className="auth-divider" />

        <p className="muted">
          Or ask an administrator to invite you to an existing workspace.
        </p>
      </div>
    </div>
  )
}
