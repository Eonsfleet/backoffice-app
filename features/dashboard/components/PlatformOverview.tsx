'use client'

import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Truck, Cpu, Users, Wifi, WifiOff, CreditCard, CircleDashed, ArrowUpRight, RefreshCw } from 'lucide-react'
import { getDashboardMetrics, getDashboardDevices, getSubscriptionMetrics, getDashboardOrganizations } from '@/features/dashboard/api'
import { KpiCard } from '@/components/shared/KpiCard'
import { QueryError } from '@/components/shared/QueryError'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DeviceBreakdown } from './DeviceBreakdown'
import { RecentActivity } from './RecentActivity'
import { SubscriptionSummary } from './SubscriptionSummary'
import { PlatformHealth } from '@/features/platform/components/PlatformHealth'
import { getDeviceHealthMetrics } from '@/features/analytics/api'
import { usePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/stores/auth.store'

export function PlatformOverview() {
  const qc = useQueryClient()
  const superAdmin = useAuthStore(s => s.user?.role === 'super_admin')
  const orgAccess = usePermission('admin.organizations.view')
  const deviceAccess = usePermission('admin.devices.view')
  const subscriptionAccess = usePermission('admin.subscriptions.view')
  const auditAccess = usePermission('admin.audit.view')
  const totals = useQuery({ queryKey: ['dashboard-metrics'], queryFn: getDashboardMetrics, enabled: superAdmin, staleTime: 60000 })
  const devices = useQuery({ queryKey: ['dashboard-devices'], queryFn: getDashboardDevices, enabled: deviceAccess, staleTime: 60000 })
  const subs = useQuery({ queryKey: ['dashboard-subscription-metrics'], queryFn: getSubscriptionMetrics, enabled: subscriptionAccess, staleTime: 60000 })
  const orgs = useQuery({ queryKey: ['dashboard-organizations'], queryFn: getDashboardOrganizations, enabled: orgAccess, staleTime: 60000 })
  const hardware = useQuery({ queryKey: ['device-health-metrics'], queryFn: () => getDeviceHealthMetrics(), enabled: superAdmin, staleTime: 60000 })
  const unassigned = hardware.data?.summary?.unassigned ?? devices.data?.unassigned
  const metrics = [
    { label: 'Organizations', value: totals.data?.total_organizations, icon: Building2, href: '/organizations', loading: totals.isLoading, show: superAdmin },
    { label: 'Vehicles & assets', value: totals.data?.total_vehicles, icon: Truck, href: '/vehicles', loading: totals.isLoading, show: superAdmin },
    { label: 'Registered devices', value: totals.data?.total_devices, icon: Cpu, href: '/devices', loading: totals.isLoading, show: superAdmin },
    { label: 'Platform users', value: totals.data?.total_users, icon: Users, href: '/users', loading: totals.isLoading, show: superAdmin },
    { label: 'Devices online', value: devices.data?.online, icon: Wifi, href: '/devices?status=online', loading: devices.isLoading, show: deviceAccess },
    { label: 'Devices offline', value: devices.data?.offline, icon: WifiOff, href: '/devices?status=offline', loading: devices.isLoading, show: deviceAccess },
    { label: 'Unassigned devices', value: unassigned, icon: CircleDashed, href: '/devices?status=unassigned', loading: hardware.isLoading, show: superAdmin },
    { label: 'Active subscriptions', value: subs.data?.active_subscriptions, icon: CreditCard, href: '/subscriptions/subscribers?status=active', loading: subs.isLoading, show: subscriptionAccess },
  ]
  const refreshing = hardware.isFetching || totals.isFetching || devices.isFetching || subs.isFetching || orgs.isFetching
  return <div className="space-y-6">
    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Eonsfleet backoffice <span className="ml-auto normal-case tracking-normal">Platform-wide overview</span></div>
    <PageHeader title="Platform overview" description="Your customers, fleet operations and account health in one place." actions={<Button variant="outline" size="sm" disabled={refreshing} onClick={() => { for (const key of ['dashboard-metrics', 'dashboard-devices', 'dashboard-subscription-metrics', 'dashboard-organizations', 'dashboard-recent-activity', 'device-health-metrics', 'platform-health']) void qc.invalidateQueries({ queryKey: [key] }) }}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />Refresh</Button>} />
    {totals.isError && <QueryError error={totals.error} retry={() => void totals.refetch()} label="platform totals" />}
    {hardware.isError && <QueryError error={hardware.error} retry={() => void hardware.refetch()} label="unassigned hardware" />}
    {devices.isError && <QueryError error={devices.error} retry={() => void devices.refetch()} label="device health" />}
    {subs.isError && <QueryError error={subs.error} retry={() => void subs.refetch()} label="subscription status" />}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.filter(m => m.show).map(m => <KpiCard key={m.label} label={m.label} value={m.value} icon={m.icon} href={m.href} isLoading={m.loading} />)}</div>
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_340px]">
      <Card><CardHeader className="flex flex-row items-start justify-between"><div><CardTitle>Recently created organizations</CardTitle><CardDescription>Newest accounts created this month and their fleet footprint</CardDescription></div>{orgAccess && <Link href="/organizations" className="text-xs font-medium text-primary">View all <ArrowUpRight className="inline h-3 w-3" /></Link>}</CardHeader><CardContent>
        {!orgAccess ? <p className="text-sm text-muted-foreground">Organization information is restricted to authorized team members.</p> : orgs.isError ? <QueryError error={orgs.error} retry={() => void orgs.refetch()} label="organization activity" /> : orgs.isLoading ? <Skeleton className="h-56 w-full" /> : !orgs.data?.length ? <p className="py-10 text-center text-sm text-muted-foreground">No organizations have been returned. New customer accounts will appear here.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground"><th className="pb-3 font-medium">Organization</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Plan</th><th className="pb-3 text-right font-medium">Assets</th><th className="pb-3 text-right font-medium">Devices</th></tr></thead><tbody>{orgs.data.map(org => <tr key={org.id} className="border-b last:border-0"><td className="py-4 pr-4"><Link className="font-semibold hover:text-primary" href={`/organizations/${org.id}`}>{org.name}</Link><p className="mt-1 text-[11px] text-muted-foreground">{org.identifier ?? org.id}</p></td><td className="pr-4"><StatusBadge status={org.status} /></td><td className="pr-4 text-xs text-muted-foreground">{org.current_plan?.plan?.name ?? org.subscription_plan ?? 'Unavailable'}</td><td className="text-right tabular-nums">{org.total_vehicles ?? org.vehicle_count ?? '—'}</td><td className="text-right tabular-nums">{org.total_devices ?? '—'}</td></tr>)}</tbody></table></div>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Needs attention</CardTitle><CardDescription>Review operational signals across your accounts.</CardDescription></CardHeader><CardContent className="space-y-3">
        {[{ title: 'Offline devices', value: devices.data?.offline, href: '/devices?status=offline', show: deviceAccess }, { title: 'Unassigned hardware', value: unassigned, href: '/devices?status=unassigned', show: deviceAccess }, { title: 'Expired subscriptions', value: subs.data?.expired_subscriptions, href: '/subscriptions/subscribers?status=expired', show: subscriptionAccess }].filter(a => a.show).map(a => <Link key={a.title} href={a.href} className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"><span className="flex-1 text-sm font-medium">{a.title}</span><span className="rounded-md bg-muted px-2 py-1 text-sm font-semibold tabular-nums">{a.value?.toLocaleString() ?? '—'}</span><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></Link>)}
        {!deviceAccess && !subscriptionAccess && <p className="text-sm text-muted-foreground">No operational signals are available for your current access.</p>}
      </CardContent></Card>
    </div>
    <div className="grid gap-5 lg:grid-cols-3">{deviceAccess && <DeviceBreakdown />}{subscriptionAccess && <SubscriptionSummary />}{superAdmin && <PlatformHealth compact />}</div>
    {auditAccess && <RecentActivity />}
  </div>
}
