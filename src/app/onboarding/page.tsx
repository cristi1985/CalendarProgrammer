import { OnboardingForm } from "./OnboardingForm"

export default function OnboardingPage() {
  return (
     <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Welcome</h1>
        <p className="auth-subtitle">
          You are signed in, but you do not belong to any workspace yet.
        </p>

        <h2 className="section-title">Create a workspace</h2>

        <OnboardingForm />

        <hr className="auth-divider" />

        <p className="muted">
          Or ask an administrator to invite you to an existing workspace.
        </p>
      </div>
    </div>
  )
}
