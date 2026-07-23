import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  redirectMock,
  revalidatePathMock,
  syncAuthenticatedUserMock,
  dbMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  syncAuthenticatedUserMock: vi.fn(),
  dbMock: {
    tenantUser: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}))

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))

vi.mock('@/lib/auth', () => ({
  syncAuthenticatedUser: (...args: unknown[]) =>
    syncAuthenticatedUserMock(...args),
}))

vi.mock('@/lib/db', () => ({
  db: dbMock,
}))

import {
  deleteTenantMember,
  deleteTenantMemberAction,
} from '../actions'

function authenticatedUser(role: string) {
  return {
    user: { id: 'current-user' },
    tenantUser: {
      id: 'current-tenant-user',
      userId: 'current-user',
      tenantId: 'tenant-1',
      role,
    },
  }
}

function targetMember(role: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'target-tenant-user',
    userId: 'target-user',
    role,
    ...overrides,
  }
}

function memberFormData(tenantUserId = 'target-tenant-user') {
  const formData = new FormData()
  formData.set('tenantUserId', tenantUserId)
  return formData
}

async function expectSuccessfulRemoval(
  currentRole: string,
  targetRole: string
) {
  syncAuthenticatedUserMock.mockResolvedValue(
    authenticatedUser(currentRole)
  )
  dbMock.tenantUser.findFirst.mockResolvedValue(targetMember(targetRole))
  dbMock.tenantUser.deleteMany.mockResolvedValue({ count: 1 })

  await deleteTenantMember(memberFormData())

  expect(dbMock.tenantUser.findFirst).toHaveBeenCalledWith({
    where: {
      id: 'target-tenant-user',
      tenantId: 'tenant-1',
    },
    select: {
      id: true,
      userId: true,
      role: true,
    },
  })
  expect(dbMock.tenantUser.deleteMany).toHaveBeenCalledWith({
    where: {
      id: 'target-tenant-user',
      tenantId: 'tenant-1',
      role: targetRole,
    },
  })
  expect(revalidatePathMock).toHaveBeenCalledTimes(1)
}

describe('deleteTenantMember', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    syncAuthenticatedUserMock.mockResolvedValue(authenticatedUser('owner'))
  })

  it('allows an owner to remove a member', async () => {
    await expectSuccessfulRemoval('owner', 'member')
  })

  it('allows an admin to remove a member', async () => {
    await expectSuccessfulRemoval('admin', 'member')
  })

  it('allows an admin to remove an owner', async () => {
    await expectSuccessfulRemoval('admin', 'owner')
  })

  it.each([
    ['owner', 'owner'],
    ['owner', 'admin'],
    ['admin', 'admin'],
    ['member', 'owner'],
    ['member', 'admin'],
    ['member', 'member'],
  ])(
    'does not allow a %s to remove a %s',
    async (currentRole, targetRole) => {
      syncAuthenticatedUserMock.mockResolvedValue(
        authenticatedUser(currentRole)
      )
      dbMock.tenantUser.findFirst.mockResolvedValue(
        targetMember(targetRole)
      )

      await expect(
        deleteTenantMember(memberFormData())
      ).rejects.toThrow(
        'You do not have permission to delete this workspace member.'
      )

      expect(dbMock.tenantUser.deleteMany).not.toHaveBeenCalled()
      expect(revalidatePathMock).not.toHaveBeenCalled()
    }
  )

  it('does not allow a user to remove themselves', async () => {
    dbMock.tenantUser.findFirst.mockResolvedValue(
      targetMember('member', { userId: 'current-user' })
    )

    await expect(deleteTenantMember(memberFormData())).rejects.toThrow(
      'You cannot delete yourself from the workspace.'
    )

    expect(dbMock.tenantUser.deleteMany).not.toHaveBeenCalled()
  })

  it('rejects a tenant user id belonging to another tenant', async () => {
    dbMock.tenantUser.findFirst.mockResolvedValue(null)

    await expect(deleteTenantMember(memberFormData())).rejects.toThrow(
      'The selected workspace member does not exist.'
    )

    expect(dbMock.tenantUser.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'target-tenant-user',
          tenantId: 'tenant-1',
        },
      })
    )
    expect(dbMock.tenantUser.deleteMany).not.toHaveBeenCalled()
  })

  it.each([null, '', '   '])(
    'rejects an invalid tenant user id: %s',
    async (tenantUserId) => {
      const formData = new FormData()
      if (tenantUserId !== null) {
        formData.set('tenantUserId', tenantUserId)
      }

      await expect(deleteTenantMember(formData)).rejects.toThrow(
        'Please select a valid workspace member to delete.'
      )

      expect(dbMock.tenantUser.findFirst).not.toHaveBeenCalled()
      expect(dbMock.tenantUser.deleteMany).not.toHaveBeenCalled()
    }
  )

  it('reports when the membership was not deleted', async () => {
    dbMock.tenantUser.findFirst.mockResolvedValue(targetMember('member'))
    dbMock.tenantUser.deleteMany.mockResolvedValue({ count: 0 })

    await expect(deleteTenantMember(memberFormData())).rejects.toThrow(
      'Failed to delete the workspace member. Please try again.'
    )

    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})

describe('deleteTenantMemberAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    syncAuthenticatedUserMock.mockResolvedValue(authenticatedUser('owner'))
  })

  it('returns a success state after removing a member', async () => {
    dbMock.tenantUser.findFirst.mockResolvedValue(targetMember('member'))
    dbMock.tenantUser.deleteMany.mockResolvedValue({ count: 1 })

    await expect(
      deleteTenantMemberAction({ ok: false }, memberFormData())
    ).resolves.toEqual({
      ok: true,
      message: 'Workspace member deleted successfully.',
    })
  })

  it('returns an error state when removal is forbidden', async () => {
    dbMock.tenantUser.findFirst.mockResolvedValue(targetMember('admin'))

    await expect(
      deleteTenantMemberAction({ ok: false }, memberFormData())
    ).resolves.toEqual({
      ok: false,
      message:
        'You do not have permission to delete this workspace member.',
    })
  })
})
