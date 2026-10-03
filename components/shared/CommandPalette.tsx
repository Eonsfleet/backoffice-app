'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search, ArrowRight, Loader2, Building2, Cpu, Users, Truck, Shield } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { listOrganizations } from '@/features/organizations/api'
import { listDevices } from '@/features/devices/api'
import { listUsers } from '@/features/users/api'
import { listVehicles } from '@/features/vehicles/api'
import { listAdminUsers } from '@/features/admin-users/api'
import { useAuthStore } from '@/stores/auth.store'
import { useDebounce } from '@/hooks/useDebounce'
import { NAV_GROUPS, canAccessNavigation, getRouteItem } from '@/lib/navigation'
import { QueryError } from './QueryError'
import { cn } from '@/lib/utils'

type Result = { id: string; label: string; detail: string; href: string; group: string; icon: React.ElementType }

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const user = useAuthStore(s => s.user)
  const router = useRouter()
  const term = useDebounce(query.trim(), 300)
  const enabled = open && term.length >= 2
  const allowed = (path: string) => { const item = getRouteItem(path); return !!item && canAccessNavigation(user, item) }
  const orgs = useQuery({ queryKey: ['cmd-orgs', term], queryFn: () => listOrganizations({ q: term, per_page: 5 }), enabled: enabled && allowed('/organizations'), staleTime: 10000 })
  const devices = useQuery({ queryKey: ['cmd-devices', term], queryFn: () => listDevices({ q: term, per_page: 5 }), enabled: enabled && allowed('/devices'), staleTime: 10000 })
  const users = useQuery({ queryKey: ['cmd-users', term], queryFn: () => listUsers({ q: term, per_page: 5 }), enabled: enabled && allowed('/users'), staleTime: 10000 })
  const vehicles = useQuery({ queryKey: ['cmd-vehicles', term], queryFn: () => listVehicles({ q: term, per_page: 5 }), enabled: enabled && allowed('/vehicles'), staleTime: 10000 })
  const admins = useQuery({ queryKey: ['cmd-admins', term], queryFn: () => listAdminUsers({ q: term, per_page: 5 }), enabled: enabled && allowed('/admin-users'), staleTime: 10000 })
  const queries = [{ q: orgs, name: 'organizations', allowed: allowed('/organizations') }, { q: devices, name: 'devices', allowed: allowed('/devices') }, { q: users, name: 'customer users', allowed: allowed('/users') }, { q: vehicles, name: 'vehicles', allowed: allowed('/vehicles') }, { q: admins, name: 'internal admins', allowed: allowed('/admin-users') }]
  const loading = open && query.trim().length >= 2 && (term !== query.trim() || queries.some(x => x.allowed && x.q.isFetching))
  const results: Result[] = []
  if (allowed('/organizations')) orgs.data?.data.forEach(o => results.push({ id: `org-${o.id}`, label: o.name, detail: `${o.identifier ?? o.id} · ${o.owner_email ?? o.email ?? o.status}`, href: `/organizations/${o.id}`, group: 'Organizations', icon: Building2 }))
  if (allowed('/devices')) devices.data?.data.forEach(d => results.push({ id: `dev-${d.id}`, label: d.device_id, detail: `${d.organization?.name ?? 'Unassigned'} · ${d.vehicle?.plate_number ?? d.status}`, href: `/devices/${d.id}`, group: 'Devices', icon: Cpu }))
  if (allowed('/users')) users.data?.data.forEach(u => results.push({ id: `user-${u.id}`, label: u.name, detail: `${u.email} · ${u.organization?.name ?? 'No organization'}`, href: `/users?q=${encodeURIComponent(u.email)}`, group: 'Customer users', icon: Users }))
  if (allowed('/vehicles')) vehicles.data?.data.forEach(v => results.push({ id: `vehicle-${v.id}`, label: v.plate_number, detail: `${v.organization?.name ?? 'Unassigned'} · ${[v.make, v.model].filter(Boolean).join(' ')}`, href: `/vehicles?q=${encodeURIComponent(v.plate_number)}`, group: 'Vehicles', icon: Truck }))
  if (allowed('/admin-users')) admins.data?.data.forEach(a => results.push({ id: `admin-${a.id}`, label: a.name, detail: `${a.email} · ${a.role}`, href: `/admin-users?q=${encodeURIComponent(a.email)}`, group: 'Internal administrators', icon: Shield }))
  const links: Result[] = NAV_GROUPS.flatMap(g => g.items).filter(i => canAccessNavigation(user, i)).map(i => ({ id: i.href, label: i.label, detail: 'Open workspace', href: i.href, group: 'Quick navigation', icon: i.icon }))
  const items = query.trim().length >= 2 ? (term === query.trim() ? results : []) : links
  const groups = [...new Set(items.map(i => i.group))]
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(o => !o) } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  const navigate = (href: string) => { router.push(href); setOpen(false); setQuery(''); setActive(0) }
  return <>
    <button onClick={() => setOpen(true)} aria-label="Search the platform" className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted"><Search className="h-4 w-4" /><span className="hidden sm:inline">Search the platform...</span><kbd className="ml-8 hidden rounded border bg-card px-1.5 text-[10px] sm:inline">Ctrl K</kbd></button>
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) { setQuery(''); setActive(0) } }}>
      <DialogContent className="max-w-xl overflow-hidden p-0" onKeyDown={e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.max(0, Math.min(i + 1, items.length - 1))) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
        if (e.key === 'Enter' && items[active]) { e.preventDefault(); navigate(items[active].href) }
      }}>
        <DialogTitle className="sr-only">Global platform search</DialogTitle><DialogDescription className="sr-only">Search accessible organizations, devices, customer users, vehicles and internal administrators.</DialogDescription>
        <div className="flex items-center gap-3 border-b p-4">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}<Input autoFocus aria-label="Global search" value={query} onChange={e => { setQuery(e.target.value); setActive(0) }} placeholder="Name, email, registration or IMEI..." className="border-0 shadow-none focus-visible:ring-0" /></div>
        <div className="max-h-[420px] overflow-y-auto p-2" aria-live="polite">
          {enabled && queries.filter(x => x.allowed && x.q.isError).map(x => <div className="mb-2" key={x.name}><QueryError error={x.q.error} retry={() => void x.q.refetch()} label={x.name} /></div>)}
          {!items.length && !loading && <p className="p-8 text-center text-sm text-muted-foreground">{query.trim().length >= 2 ? `No matching records for "${query}". Try an email, name or identifier.` : 'No workspaces are available for your role.'}</p>}
          {groups.map(group => <div key={group}><p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>{items.filter(i => i.group === group).map(item => { const index = items.indexOf(item); const Icon = item.icon; return <button key={item.id} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => navigate(item.href)} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left', index === active ? 'bg-accent' : 'hover:bg-muted')}><Icon className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.label}</span><span className="block truncate text-xs text-muted-foreground">{item.detail}</span></span><ArrowRight className="h-3 w-3 text-muted-foreground" /></button> })}</div>)}
        </div><div className="border-t px-4 py-3 text-[11px] text-muted-foreground">Arrow keys to navigate · Enter to open · Esc to close · Up to 5 records per category</div>
      </DialogContent>
    </Dialog>
  </>
}
