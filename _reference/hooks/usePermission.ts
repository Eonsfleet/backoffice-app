import { useAuthStore } from '@/store/authStore'

type Permission =
    | 'manage_admins'
    | 'manage_organizations'
    | 'manage_subscriptions'
    | 'manage_devices'
    | 'view_audit_logs'
    | 'view_performance'

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    super_admin: [
        'manage_admins',
        'manage_organizations',
        'manage_subscriptions',
        'manage_devices',
        'view_audit_logs',
        'view_performance',
    ],
    support: ['view_audit_logs'],
    installer: [],
}

export function usePermission() {
    const role = useAuthStore((s) => s.admin?.role)

    const can = (permission: Permission): boolean => {
        if (!role) return false
        return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
    }

    const isSuperAdmin = role === 'super_admin'
    const isSupport = role === 'support'

    return { can, isSuperAdmin, isSupport, role }
}
