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
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false
}
