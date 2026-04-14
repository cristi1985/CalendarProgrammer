import Link from 'next/link'

export default function Home() {
  return (
    <div>
      <h1>Calendar Programmer</h1>
      <p>Room booking SaaS</p>

      <Link href="/signin">Sign in</Link>
    </div>
  )
}
