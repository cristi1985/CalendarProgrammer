import Link from 'next/link'

export default function OnboardingPage() {
  return (
    <div>
      <h1>Welcome</h1>
      <p>You are signed in, but you do not belong to any workspace yet.</p>
      <p>You can ask an administrator to invite you or create a new workspace later.</p>
      <Link href="/signin">Back to sign in</Link>
    </div>
  )
}
