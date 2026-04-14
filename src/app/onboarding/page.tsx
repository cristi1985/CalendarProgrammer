import { createWorkspace } from "./actions"


export default function OnboardingPage() {
  return (
      <div>
      <h1>Welcome</h1>
      <p>You are signed in, but you do not belong to any workspace yet.</p>

      <h2>Create a workspace</h2>

      <form action={createWorkspace}>
        <input
          name="name"
          placeholder="Workspace name"
          required
        />
        <button type="submit">Create workspace</button>
      </form>

      <hr />

      <p>
        Or ask an administrator to invite you to an existing workspace.
      </p>
    </div>
  )
}
