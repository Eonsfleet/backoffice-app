import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard, Building2, CreditCard, Cpu,
    Users, ScrollText, Activity, User
} from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'

const NAV = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: null },
    { to: '/organizations', label: 'Organizations', icon: Building2, permission: null },
    { to: '/subscriptions', label: 'Subscriptions', icon: CreditCard, permission: null },
    { to: '/devices', label: 'Devices', icon: Cpu, permission: null },
    { to: '/admins', label: 'Admin Users', icon: Users, permission: 'manage_admins' },
    { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText, permission: 'view_audit_logs' },
    { to: '/performance', label: 'Performance', icon: Activity, permission: 'view_performance' },
    { to: '/profile', label: 'Profile', icon: User, permission: null },
] as const

export default function Sidebar() {
    const { can } = usePermission()

    return (
        <aside className="w-64 border-r bg-white flex flex-col">
            <div className="h-16 flex items-center px-6 border-b">
                <span className="text-lg font-bold text-blue-600">EonsFleet Admin</span>
            </div>
            <nav className="flex-1 p-4 space-y-1">
                {NAV.map(({ to, label, icon: Icon, permission }) => {
                    if (permission && !can(permission)) return null
                    return (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                )
                            }
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </NavLink>
                    )
                })}
            </nav>
        </aside>
    )
}
