'use client'

import { useAuthStore } from '@/stores/auth.store'

// Superadmin bypasses all permission checks
export function usePermission(permission: string): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  if (user.role === 'super_admin') return true

  const rolePermissions: Record<string, string[]> = {
    support: [
      'admin.organizations.view',
      'admin.devices.view',
      'admin.devices.assign',
      'admin.audit.view',
      'admin.billing.view',
      'admin.tracking.view',
    ],
    installer: [
      'admin.devices.view',
      'admin.devices.assign',
    ],
  }

  return rolePermissions[user.role]?.includes(permission) ?? false
}
