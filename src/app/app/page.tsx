import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AppPage() {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {result.user.fullName}</p>
      <p>Tenant: {result.tenantUser.tenant.name}</p>
    </div>
  )
}
