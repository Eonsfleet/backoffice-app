import { describe, expect, it } from 'vitest'
import { canAccessNavigation, getRouteItem } from '@/lib/navigation'
import type { AdminUser } from '@/types/api'

const user = (role: string, permissions?: string[]): AdminUser => ({ id: '1', name: 'Test', email: 'test@example.com', avatar: null, last_login: null, role, permissions })

describe('workspace access', () => {
  it('denies navigation before authentication', () => {
    expect(canAccessNavigation(null, getRouteItem('/dashboard')!)).toBe(false)
  })
  it('matches detail routes and the most specific nested workspace', () => {
    expect(getRouteItem('/devices/123')?.href).toBe('/devices')
    expect(getRouteItem('/admin-users/roles')?.href).toBe('/admin-users/roles')
    expect(getRouteItem('/subscriptions/reconciliation')?.href).toBe('/subscriptions')
    expect(getRouteItem('/devices-unrelated')).toBeUndefined()
  })
  it('limits finance to authorized commercial workspaces', () => {
    expect(canAccessNavigation(user('finance'), getRouteItem('/billing')!)).toBe(true)
    expect(canAccessNavigation(user('finance'), getRouteItem('/devices')!)).toBe(false)
    expect(canAccessNavigation(user('finance'), getRouteItem('/admin-users')!)).toBe(false)
  })
  it('honors explicit existing permissions without granting governance access', () => {
    expect(canAccessNavigation(user('custom', ['admin.devices.view']), getRouteItem('/devices/1')!)).toBe(true)
    expect(canAccessNavigation(user('custom', ['admin.devices.view']), getRouteItem('/settings')!)).toBe(false)
  })
  it('preserves super-admin governance access', () => {
    expect(canAccessNavigation(user('super_admin'), getRouteItem('/admin-users/roles')!)).toBe(true)
  })
})
