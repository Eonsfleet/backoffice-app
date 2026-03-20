'use client'

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Activity, Cpu, TrendingUp, AlertTriangle, CheckCircle2, Wifi, WifiOff, CircleDashed } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { getFleetHealthMetrics, getDeviceHealthMetrics, getGrowthMetrics } from '@/features/analytics/api'

function ChartCard({ title, children, isLoading }: { title: string; children: React.ReactNode; isLoading?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="h-48">{children}</div>
        )}
      </CardContent>
    </Card>
  )
}

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  muted: 'hsl(var(--muted-foreground))',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  violet: '#8b5cf6',
}

export default function AnalyticsPage() {
  const [growthMonths, setGrowthMonths] = useState('12')

  const fleetQ = useQuery({
    queryKey: ['analytics-fleet'],
    queryFn: getFleetHealthMetrics,
    staleTime: 60_000,
  })

  const deviceQ = useQuery({
    queryKey: ['analytics-device'],
    queryFn: getDeviceHealthMetrics,
    staleTime: 60_000,
  })

  const growthQ = useQuery({
    queryKey: ['analytics-growth', growthMonths],
    queryFn: () => getGrowthMetrics({ months: Number(growthMonths) }),
    staleTime: 60_000,
  })

  const fleet  = fleetQ.data
  const device = deviceQ.data
  const growth = growthQ.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Business intelligence, growth metrics, and fleet performance insights."
        icon={BarChart3}
      />

      {/* Fleet Health */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fleet Health</h2>

        {/* Vehicle summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Vehicles"   value={fleet?.summary.total}          icon={Activity}      iconClassName="bg-primary/10"     isLoading={fleetQ.isLoading} />
          <KpiCard label="With Device"      value={fleet?.summary.with_device}    icon={CheckCircle2}  iconClassName="bg-emerald-500/10" isLoading={fleetQ.isLoading} />
          <KpiCard label="Device Online"    value={fleet?.summary.device_online}  icon={Wifi}          iconClassName="bg-blue-500/10"    isLoading={fleetQ.isLoading} />
          <KpiCard label="Device Offline"   value={fleet?.summary.device_offline} icon={WifiOff}       iconClassName="bg-red-500/10"     isLoading={fleetQ.isLoading} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Movement */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Movement</CardTitle>
              <CardDescription className="text-xs">Real-time vehicle activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fleetQ.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
              ) : (
                [
                  { label: 'Moving Now',      value: fleet?.movement.moving_now,     color: 'text-emerald-600' },
                  { label: 'Active Today',    value: fleet?.movement.active_today,   color: 'text-blue-600' },
                  { label: 'Inactive Today',  value: fleet?.movement.inactive_today, color: 'text-muted-foreground' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={`text-sm font-bold tabular-nums ${color}`}>{value ?? '—'}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Trips */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Trips</CardTitle>
              <CardDescription className="text-xs">Today and this month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fleetQ.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
              ) : (
                [
                  { label: 'Total Today',          value: fleet?.trips.total_today },
                  { label: 'In Progress',           value: fleet?.trips.in_progress },
                  { label: 'Completed This Month',  value: fleet?.trips.completed_this_month },
                  { label: 'Distance This Month',   value: `${fleet?.trips.total_distance_km_this_month ?? 0} km` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-bold tabular-nums">{value ?? '—'}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Status distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Vehicle Status</CardTitle>
              <CardDescription className="text-xs">Distribution by status</CardDescription>
            </CardHeader>
            <CardContent>
              {fleetQ.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={fleet?.status_distribution ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="status" width={72} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="count" fill={CHART_COLORS.primary} name="Vehicles" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Device Health */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Device Health</h2>

        {/* Summary KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Devices"  value={device?.summary.total}      icon={Cpu}           iconClassName="bg-primary/10"      isLoading={deviceQ.isLoading} />
          <KpiCard label="Online"         value={device?.summary.online}     icon={Wifi}          iconClassName="bg-emerald-500/10"  isLoading={deviceQ.isLoading} />
          <KpiCard label="Offline"        value={device?.summary.offline}    icon={WifiOff}       iconClassName="bg-red-500/10"      isLoading={deviceQ.isLoading} />
          <KpiCard label="Unassigned"     value={device?.summary.unassigned} icon={CircleDashed}  iconClassName="bg-blue-500/10"     isLoading={deviceQ.isLoading} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Last Seen Buckets */}
          <ChartCard title="Last Seen Distribution" isLoading={deviceQ.isLoading}>
            {device?.last_seen_buckets && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={device.last_seen_buckets} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="bucket" width={72} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" name="Devices" radius={[0, 3, 3, 0]}>
                    {device.last_seen_buckets.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? CHART_COLORS.emerald : i <= 2 ? CHART_COLORS.amber : CHART_COLORS.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Signal Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Signal Quality</CardTitle>
              <CardDescription className="text-xs">Distribution of device signal strength</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {deviceQ.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
              ) : (device?.signal_distribution ?? []).map((s) => {
                const total   = device!.summary.total || 1
                const pct     = Math.round((s.count / total) * 100)
                const color   = s.quality === 'excellent' ? 'bg-emerald-500' : s.quality === 'good' ? 'bg-blue-500' : s.quality === 'fair' ? 'bg-amber-500' : 'bg-red-500'
                return (
                  <div key={s.quality} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize font-medium">{s.quality}</span>
                      <span className="text-muted-foreground">{s.count} devices · {s.range}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Stale Devices */}
        {!deviceQ.isLoading && (device?.stale_devices.count ?? 0) > 0 && (
          <Card className="mt-4 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Stale Devices ({device!.stale_devices.count})
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Not seen in over {device!.stale_devices.threshold_days} days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {device!.stale_devices.devices.slice(0, 20).map((d) => (
                  <Badge key={d.id} variant="outline" className="font-mono text-xs border-amber-300 text-amber-700 dark:text-amber-400">
                    {d.device_id ?? d.id}
                  </Badge>
                ))}
                {device!.stale_devices.count > 20 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{device!.stale_devices.count - 20} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Growth Metrics */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Growth Metrics</h2>
          <Select value={growthMonths} onValueChange={setGrowthMonths}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Last 6mo</SelectItem>
              <SelectItem value="12">Last 12mo</SelectItem>
              <SelectItem value="24">Last 24mo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="New Orgs (Period)"
            value={growth?.new_organizations_total ?? '—'}
            icon={TrendingUp}
            iconClassName="bg-blue-500/10"
            isLoading={growthQ.isLoading}
          />
          <KpiCard
            label="Fleet Size Growth"
            value={growth?.fleet_growth_percent != null ? `+${growth.fleet_growth_percent}%` : '—'}
            icon={TrendingUp}
            iconClassName="bg-emerald-500/10"
            isLoading={growthQ.isLoading}
          />
          <KpiCard
            label="New Users (Period)"
            value={growth?.new_users_total ?? '—'}
            icon={TrendingUp}
            iconClassName="bg-violet-500/10"
            isLoading={growthQ.isLoading}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <ChartCard title="New Organizations / Month" isLoading={growthQ.isLoading}>
            {growth?.organizations_by_month && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growth.organizations_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" fill={CHART_COLORS.blue} name="Organizations" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Vehicle Fleet Size Growth" isLoading={growthQ.isLoading}>
            {growth?.vehicles_by_month && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growth.vehicles_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke={CHART_COLORS.emerald} dot={false} name="Vehicles" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="User Registrations / Month" isLoading={growthQ.isLoading}>
            {growth?.users_by_month && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growth.users_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" fill={CHART_COLORS.violet} stroke={CHART_COLORS.violet} fillOpacity={0.2} name="Users" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
