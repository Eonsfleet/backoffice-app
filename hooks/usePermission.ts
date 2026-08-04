'use client'

import { useAuthStore } from '@/stores/auth.store'

/**
 * Permission strings used throughout the app (aligned with docs/backoffice-build-prompt.md).
 * Super admins bypass all checks. Other roles get the permissions listed below.
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  support: [
    // Organizations
    'admin.organizations.view',
    'admin.organizations.manage',   // create & edit
    'admin.organizations.suspend',  // suspend / unsuspend
    // Devices
    'admin.devices.view',
    'admin.devices.assign',
    // Billing & subscriptions
    'admin.billing.view',
    'admin.subscriptions.view',
    // Audit logs
    'admin.audit.view',
    // Tracking / fleet map
    'admin.tracking.view',
  ],
  // Mirrors the backend's billing.money gate (finance | super_admin) — a
  // finance admin previously had NO entry here at all, so every
  // usePermission() check silently failed for them regardless of what the
  // backend actually allowed.
  finance: [
    'admin.billing.view',
    'admin.subscriptions.view',
    'admin.billing.money',
  ],
  installer: [
    'admin.devices.view',
    'admin.devices.assign',
  ],
}

// Superadmin bypasses all permission checks.
export function usePermission(permission: string): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  if (user.role === 'super_admin') return true
  if (user.permissions?.includes(permission)) return true
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false
}
