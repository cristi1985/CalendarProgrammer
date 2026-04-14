'use server'

import { db } from '@/lib/db'
import { syncAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function createWorkspace(formData: FormData) {
  const result = await syncAuthenticatedUser()

  if (!result) {
    redirect('/signin')
  }

  if (result.tenantUser) {
    redirect('/app')
  }

  const rawName = formData.get('name')

  if (typeof rawName !== 'string' || rawName.trim().length < 3) {
    throw new Error('Workspace name must be at least 3 characters long.')
  }

  const name = rawName.trim()
  const baseSlug = slugify(name)

  if (!baseSlug) {
    throw new Error('Workspace name must contain letters or numbers.')
  }

  let slug = baseSlug
  let counter = 1

  while (await db.tenant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter += 1
  }

  const tenant = await db.tenant.create({
    data: {
      name,
      slug,
    },
  })

  await db.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: result.user.id,
      role: 'owner',
      isPermanent: false,
    },
  })

  redirect('/app')
}
