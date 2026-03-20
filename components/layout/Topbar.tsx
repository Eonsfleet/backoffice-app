'use client'

import { usePathname } from 'next/navigation'
import { Bell, Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { Sidebar } from './Sidebar'

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':               'Dashboard',
  '/organizations':           'Organizations',
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
  const { theme, setTheme, resolvedTheme } = useTheme()

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

export function Topbar() {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4">
      {/* Mobile: hamburger → sheet sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <Breadcrumb />

      <div className="ml-auto flex items-center gap-2">
        <CommandPalette />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>
      </div>
    </header>
  )
}
