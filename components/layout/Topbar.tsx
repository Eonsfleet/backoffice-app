'use client'
import { useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Inbox, Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CommandPalette } from '@/components/shared/CommandPalette'
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AdminNotification,
} from '@/features/notifications/api'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'

const ROUTE_LABELS: Record<string, string> = {
  '/installers': 'Installers',
  '/drivers': 'Drivers',
  '/platform-health': 'Service health',
  '/notification-templates': 'Notification templates',
  '/dashboard':               'Platform overview',
  '/customer-health': 'Customer health',
  '/organizations':           'Organizations',
  '/organization-requests':   'Organization Requests',
  '/devices':                 'Devices',
  '/fleet-map':               'Fleet Map',
  '/subscriptions/plans':     'Plans',
  '/subscriptions/addons':    'Addons',
  '/subscriptions/subscribers': 'Subscribers',
  '/subscriptions/analytics': 'Analytics',
  '/subscriptions':           'Subscriptions',
  '/billing':                 'Billing & Payments',
  '/admin-users/roles':       'Roles',
  '/admin-users':             'Admin Users',
  '/audit-logs':              'Audit Logs',
  '/users':                   'Users',
  '/vehicles':                'Vehicles',
  '/analytics':               'Analytics',
  '/notifications':           'Notifications',
  '/settings':                'Settings',
}

function Breadcrumb() {
  const pathname = usePathname()

  // Build segments: e.g. /organizations/123 → ['Organizations', '123']
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: string[] = []

  // Try longest match first for known labels
  for (let i = segments.length; i > 0; i--) {
    const key = '/' + segments.slice(0, i).join('/')
    if (ROUTE_LABELS[key]) {
      crumbs.unshift(ROUTE_LABELS[key])
      break
    }
  }

  // If there's a dynamic segment (like an ID) append it shortened
  const lastSegment = segments[segments.length - 1]
  const isId = lastSegment && /^[0-9a-f-]{8,}$/i.test(lastSegment)
  if (isId) crumbs.push(lastSegment.slice(0, 8) + '…')

  return (
    <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
      <span className="font-medium text-foreground">{crumbs[0] ?? 'Dashboard'}</span>
      {crumbs.slice(1).map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{crumb}</span>
        </span>
      ))}
    </nav>
  )
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}

const SEVERITY_DOT: Record<string, string> = {
  success:  'bg-emerald-500',
  warning:  'bg-amber-500',
  error:    'bg-red-500',
  critical: 'bg-red-500',
  info:     'bg-sky-500',
}

function relativeTime(value: string) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60_000))

  if (Number.isNaN(date.getTime())) return ''
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function NotificationPreviewItem({
  notification,
  onOpen,
}: {
  notification: AdminNotification
  onOpen: (notification: AdminNotification) => void
}) {
  const href = notification.action_url?.startsWith('/') ? notification.action_url : '/notifications'

  return (
    <DropdownMenuItem asChild className="cursor-pointer p-0">
      <Link
        href={href}
        onClick={() => onOpen(notification)}
        className={cn(
          'flex w-full items-start gap-3 rounded-sm px-3 py-2.5',
          !notification.is_read && 'bg-primary/5'
        )}
      >
        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', SEVERITY_DOT[notification.severity] ?? SEVERITY_DOT.info)} />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="line-clamp-1 text-sm font-medium">{notification.title}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(notification.created_at)}</span>
          </span>
          {notification.message && (
            <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{notification.message}</span>
          )}
        </span>
      </Link>
    </DropdownMenuItem>
  )
}

function NotificationBell() {
  const qc = useQueryClient()
  const listKey = ['notifications', 'preview']
  const countKey = ['notifications', 'unread-count']

  const { data: unreadCount = 0 } = useQuery({
    queryKey: countKey,
    queryFn:  getUnreadNotificationCount,
    refetchInterval: 30_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: listKey,
    queryFn:  () => listNotifications({ per_page: 6 }),
    refetchInterval: 60_000,
  })

  const markRead = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: listKey })
      qc.invalidateQueries({ queryKey: countKey })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: listKey })
      qc.invalidateQueries({ queryKey: countKey })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications = data?.data ?? []
  const visibleCount = Math.min(unreadCount, 99)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {visibleCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(380px,calc(100vw-1rem))] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <ScrollArea className="max-h-[360px]">
          <div className="p-1">
            {isLoading ? (
              <div className="space-y-3 p-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-12 rounded-md bg-muted/70" />
                ))}
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationPreviewItem
                  key={notification.id}
                  notification={notification}
                  onOpen={(item) => {
                    if (!item.is_read) markRead.mutate(item.id)
                  }}
                />
              ))
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="max-w-56 text-xs text-muted-foreground">Platform alerts and admin updates will appear here.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem asChild className="cursor-pointer justify-center rounded-none py-2.5">
          <Link href="/notifications" className="text-sm font-medium text-primary">
            View notification center
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Topbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-4">
      {/* Mobile: hamburger → sheet sidebar */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:bg-sidebar-accent [&>button]:text-sidebar-foreground [&>button]:opacity-100">
          <SheetTitle className="sr-only">Main navigation</SheetTitle>
          <SheetDescription className="sr-only">Navigate Eonsfleet workspaces and your administrator account.</SheetDescription>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1 truncate">
        <Breadcrumb />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <CommandPalette />
        <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  )
}
