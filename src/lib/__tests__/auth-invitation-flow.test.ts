import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockUser,
  getUserMock,
  cookieGetMock,
  cookieSetMock,
  dbMock,
} = vi.hoisted(() => ({
  mockUser: {
    email: 'invitee@example.com',
    user_metadata: {
      full_name: 'Invited User',
    },
  },
  getUserMock: vi.fn(),
  cookieGetMock: vi.fn(),
  cookieSetMock: vi.fn(),
  dbMock: {
    user: {
      upsert: vi.fn(),
    },
    tenantUser: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    invitation: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: cookieGetMock,
    set: cookieSetMock,
  }),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: getUserMock,
    },
  }),
}))

vi.mock('@/lib/db', () => ({
  db: dbMock,
}))

import { syncAuthenticatedUser } from '../auth'

describe('syncAuthenticatedUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when there is no authenticated user email', async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
    })

    const result = await syncAuthenticatedUser()

    expect(result).toBeNull()
  })

  it('returns existing tenant membership when one already exists', async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: mockUser,
      },
    })

    dbMock.user.upsert.mockResolvedValue({
      id: 'user-1',
      email: 'invitee@example.com',
      fullName: 'Invited User',
    })

    dbMock.tenantUser.findFirst.mockResolvedValueOnce({
      id: 'tenant-user-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'member',
      isPermanent: false,
      tenant: {
        id: 'tenant-1',
        name: 'Workspace',
      },
    })

    const result = await syncAuthenticatedUser()

    expect(dbMock.invitation.findFirst).not.toHaveBeenCalled()
    expect(result?.tenantUser?.tenantId).toBe('tenant-1')
  })

  it('creates tenant membership from pending invitation', async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: mockUser,
      },
    })

    dbMock.user.upsert.mockResolvedValue({
      id: 'user-1',
      email: 'invitee@example.com',
      fullName: 'Invited User',
    })

    dbMock.tenantUser.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'tenant-user-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'member',
        isPermanent: true,
        tenant: {
          id: 'tenant-1',
          name: 'Workspace',
        },
      })

    dbMock.invitation.findFirst.mockResolvedValue({
      id: 'invite-1',
      tenantId: 'tenant-1',
      email: 'invitee@example.com',
      role: 'member',
      isPermanent: true,
      acceptedAt: null,
    })

    dbMock.tenantUser.create.mockResolvedValue({
      id: 'tenant-user-1',
    })

    dbMock.invitation.update.mockResolvedValue({
      id: 'invite-1',
    })

    const result = await syncAuthenticatedUser()

    expect(dbMock.tenantUser.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'member',
        isPermanent: true,
      },
    })

    expect(dbMock.invitation.update).toHaveBeenCalledWith({
      where: { id: 'invite-1' },
      data: {
        acceptedAt: expect.any(Date),
      },
    })

    expect(result?.tenantUser?.tenantId).toBe('tenant-1')
  })

  it('returns null tenantUser when no membership and no invitation exist', async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: mockUser,
      },
    })

    dbMock.user.upsert.mockResolvedValue({
      id: 'user-1',
      email: 'invitee@example.com',
      fullName: 'Invited User',
    })

    dbMock.tenantUser.findFirst.mockResolvedValue(null)
    dbMock.invitation.findFirst.mockResolvedValue(null)

    const result = await syncAuthenticatedUser()

    expect(dbMock.tenantUser.create).not.toHaveBeenCalled()
    expect(result?.tenantUser).toBeNull()
  })
})