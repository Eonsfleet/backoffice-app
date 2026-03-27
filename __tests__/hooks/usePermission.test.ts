import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminUser } from '@/types/api'

function makeUser(overrides: Partial<AdminUser>): AdminUser {
  return {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'support',
    status: 'active',
    ...overrides,
  } as AdminUser
}

describe('usePermission', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null, isBootstrapping: false })
  })

  it('returns false when no user is logged in', () => {
    const { result } = renderHook(() => usePermission('admin.organizations.view'))
    expect(result.current).toBe(false)
  })

  it('returns true for super_admin regardless of permission', () => {
    useAuthStore.setState({ user: makeUser({ role: 'super_admin' }), token: 'tok' })
    const { result } = renderHook(() => usePermission('admin.anything.at.all'))
    expect(result.current).toBe(true)
  })

  it('grants support role view permissions', () => {
    useAuthStore.setState({ user: makeUser({ role: 'support' }), token: 'tok' })
    const { result: r1 } = renderHook(() => usePermission('admin.organizations.view'))
    const { result: r2 } = renderHook(() => usePermission('admin.billing.view'))
    const { result: r3 } = renderHook(() => usePermission('admin.audit.view'))
    expect(r1.current).toBe(true)
    expect(r2.current).toBe(true)
    expect(r3.current).toBe(true)
  })

  it('grants support role manage and suspend permissions', () => {
    useAuthStore.setState({ user: makeUser({ role: 'support' }), token: 'tok' })
    const { result: manage }  = renderHook(() => usePermission('admin.organizations.manage'))
    const { result: suspend } = renderHook(() => usePermission('admin.organizations.suspend'))
    expect(manage.current).toBe(true)
    expect(suspend.current).toBe(true)
  })

  it('denies support role destructive permissions', () => {
    useAuthStore.setState({ user: makeUser({ role: 'support' }), token: 'tok' })
    const { result: del }   = renderHook(() => usePermission('admin.organizations.delete'))
    const { result: admin } = renderHook(() => usePermission('admin.users.manage'))
    expect(del.current).toBe(false)
    expect(admin.current).toBe(false)
  })

  it('grants installer role device permissions only', () => {
    useAuthStore.setState({ user: makeUser({ role: 'installer' }), token: 'tok' })
    const { result: view }   = renderHook(() => usePermission('admin.devices.view'))
    const { result: assign } = renderHook(() => usePermission('admin.devices.assign'))
    const { result: orgs }   = renderHook(() => usePermission('admin.organizations.view'))
    expect(view.current).toBe(true)
    expect(assign.current).toBe(true)
    expect(orgs.current).toBe(false)
  })

  it('returns false for unknown roles', () => {
    useAuthStore.setState({ user: makeUser({ role: 'unknown_role' as never }), token: 'tok' })
    const { result } = renderHook(() => usePermission('admin.organizations.view'))
    expect(result.current).toBe(false)
  })
})
