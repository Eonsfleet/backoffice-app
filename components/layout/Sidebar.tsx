'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Cpu,
  Map,
  CreditCard,
  ScrollText,
  BarChart3,
  Settings,
  Bell,
  Truck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/string-utils'
import { useUIStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { logoutAdmin, clearAuthCookie } from '@/features/auth/api'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

const NAV_ITEMS = [
  { href: '/dashboard',              label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/organizations',          label: 'Organizations',    icon: Building2 },
  { href: '/users',                  label: 'Users',            icon: UserCircle },
  { href: '/vehicles',               label: 'Vehicles',         icon: Truck },
  { href: '/devices',                label: 'Devices',          icon: Cpu },
  { href: '/fleet-map',              label: 'Fleet Map',        icon: Map,        badge: 'Live' },
  { href: '/subscriptions',          label: 'Subscriptions',    icon: CreditCard },
  { href: '/audit-logs',             label: 'Audit Logs',       icon: ScrollText },
  { href: '/analytics',              label: 'Analytics',        icon: BarChart3 },
  { href: '/notifications',          label: 'Notifications',    icon: Bell },
  { href: '/settings',               label: 'Settings',         icon: Settings },
]

function NavItem({
  href,
  label,
  icon: Icon,
  badge,
  collapsed,
  active,
}: {
  href: string
  label: string
  icon: React.ElementType
  badge?: string
  collapsed: boolean
  active: boolean
}) {
  const item = (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-sidebar-primary-foreground')} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-semibold text-primary">
              {badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{item}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {label}
          {badge && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{badge}</Badge>}
        </TooltipContent>
      </Tooltip>
    )
  }

  return item
}


export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const handleLogout = async () => {
    await logoutAdmin()
    clearAuth()
    clearAuthCookie()
    router.replace('/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className={cn('flex h-14 items-center border-b border-sidebar-border px-4', collapsed && 'justify-center px-0')}>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                EonsFleet<span className="text-primary"> Admin</span>
              </span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-3">
          <nav className={cn('flex flex-col gap-0.5 px-2')}>
            {NAV_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                collapsed={collapsed}
                active={isActive(item.href)}
              />
            ))}
          </nav>
        </ScrollArea>

        <Separator className="bg-sidebar-border" />

        {/* User footer */}
        <div className={cn('flex items-center gap-3 p-3', collapsed && 'justify-center')}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {user ? getInitials(user.name) : 'A'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">{user?.name ?? 'Admin'}</p>
              <p className="truncate text-[10px] text-sidebar-foreground/50 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-destructive"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-[72px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground/50 shadow-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>
    </TooltipProvider>
  )
}
