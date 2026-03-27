'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, Cpu, Users, ArrowRight, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { listOrganizations } from '@/features/organizations/api'
import { listDevices } from '@/features/devices/api'
import { listAdminUsers } from '@/features/admin-users/api'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'

interface CommandResult {
  id: string
  label: string
  sublabel?: string
  href: string
  icon: React.ElementType
  group: string
}

const CMD_LIMIT = 5

function useCommandResults(query: string) {
  const enabled = query.trim().length >= 2

  const orgsQ = useQuery({
    queryKey: ['cmd-orgs', query],
    queryFn: () => listOrganizations({ q: query, per_page: CMD_LIMIT }),
    enabled,
    staleTime: 10_000,
  })

  const devicesQ = useQuery({
    queryKey: ['cmd-devices', query],
    queryFn: () => listDevices({ q: query, per_page: CMD_LIMIT }),
    enabled,
    staleTime: 10_000,
  })

  const usersQ = useQuery({
    queryKey: ['cmd-users', query],
    queryFn: () => listAdminUsers({ q: query, per_page: CMD_LIMIT }),
    enabled,
    staleTime: 10_000,
  })

  const results: CommandResult[] = []
  // Track which groups have more results than the display limit
  const truncated: Record<string, boolean> = {}

  const orgData = orgsQ.data?.data ?? []
  truncated['Organizations'] = (orgsQ.data?.meta?.total ?? 0) > CMD_LIMIT
  orgData.forEach((org) => {
    results.push({
      id: `org-${org.id}`,
      label: org.name,
      sublabel: org.owner_email ?? org.identifier,
      href: `/organizations/${org.id}`,
      icon: Building2,
      group: 'Organizations',
    })
  })

  const deviceData = devicesQ.data?.data ?? []
  truncated['Devices'] = (devicesQ.data?.meta?.total ?? 0) > CMD_LIMIT
  deviceData.forEach((device) => {
    results.push({
      id: `dev-${device.id}`,
      label: device.device_id,
      sublabel: device.organization?.name ?? 'Unassigned',
      href: `/devices/${device.id}`,
      icon: Cpu,
      group: 'Devices',
    })
  })

  const userData = usersQ.data?.data ?? []
  truncated['Admin Users'] = (usersQ.data?.meta?.total ?? 0) > CMD_LIMIT
  userData.forEach((user) => {
    results.push({
      id: `user-${user.id}`,
      label: user.name,
      sublabel: user.email,
      href: `/admin-users`,
      icon: Users,
      group: 'Admin Users',
    })
  })

  const isLoading = enabled && (orgsQ.isLoading || devicesQ.isLoading || usersQ.isLoading)

  return { results, isLoading, truncated }
}

const QUICK_LINKS: CommandResult[] = [
  { id: 'q-dashboard',     label: 'Dashboard',        href: '/dashboard',             icon: ArrowRight, group: 'Quick Links' },
  { id: 'q-orgs',          label: 'Organizations',    href: '/organizations',          icon: ArrowRight, group: 'Quick Links' },
  { id: 'q-devices',       label: 'Devices',          href: '/devices',                icon: ArrowRight, group: 'Quick Links' },
  { id: 'q-fleet',         label: 'Fleet Map',        href: '/fleet-map',              icon: ArrowRight, group: 'Quick Links' },
  { id: 'q-subscriptions', label: 'Subscriptions',    href: '/subscriptions/plans',    icon: ArrowRight, group: 'Quick Links' },
  { id: 'q-audit',         label: 'Audit Logs',       href: '/audit-logs',             icon: ArrowRight, group: 'Quick Links' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  const { results, isLoading, truncated } = useCommandResults(debouncedQuery)
  const items = query.trim().length >= 2 ? results : QUICK_LINKS

  // Cmd/Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
    } else {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Reset active index when items change
  useEffect(() => {
    setActiveIndex(0)
  }, [items.length])

  const navigate = useCallback(
    (href: string) => {
      router.push(href)
      setOpen(false)
    },
    [router]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && items[activeIndex]) {
      navigate(items[activeIndex].href)
    }
  }

  // Group items by group name
  const grouped: Record<string, CommandResult[]> = {}
  items.forEach((item) => {
    if (!grouped[item.group]) grouped[item.group] = []
    grouped[item.group].push(item)
  })

  let flatIndex = 0

  return (
    <>
      {/* Trigger button shown in Topbar */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Open command palette"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search…</span>
        <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 text-[10px] font-mono font-medium opacity-60">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden" onKeyDown={handleKeyDown}>
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search organizations, devices, users…"
              className="border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Results */}
          <div className="max-h-[380px] overflow-y-auto py-2">
            {items.length === 0 && !isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results for &quot;{query}&quot;
              </p>
            ) : (
              Object.entries(grouped).map(([group, groupItems]) => (
                <div key={group} className="mb-1">
                  <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {group}
                  </p>
                  {groupItems.map((item) => {

                    const idx = flatIndex++
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.href)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                          idx === activeIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground hover:bg-accent/50'
                        )}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.label}</p>
                          {item.sublabel && (
                            <p className="truncate text-xs text-muted-foreground">{item.sublabel}</p>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </button>
                    )
                  })}
                  {truncated[group] && (
                    <p className="px-4 py-1.5 text-[11px] text-muted-foreground/50 italic">
                      Showing top {CMD_LIMIT} — refine your search to see more
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted-foreground/60">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> select</span>
            <span><kbd className="font-mono">Esc</kbd> close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
