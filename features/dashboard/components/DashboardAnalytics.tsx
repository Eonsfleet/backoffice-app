'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Cpu,
  RadioTower,
  Route,
  Truck,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  getDeviceHealthMetrics,
  getFleetHealthMetrics,
  getGrowthMetrics,
  type GrowthAnalytics,
} from '@/features/analytics/api'

const COLORS = {
  primary: 'hsl(var(--primary))',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  slate: '#64748b',
}

function pct(part = 0, total = 0) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function TrendPill({ value }: { value?: number }) {
  const positive = (value ?? 0) >= 0
  const Icon = positive ? ArrowUpRight : ArrowDownRight

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-destructive'}`}>
      <Icon className="h-3.5 w-3.5" />
      {positive ? '+' : ''}{value ?? 0}%
    </span>
  )
}

function StatRow({
  label,
  value,
  icon: Icon,
  tone = 'primary',
}: {
  label: string
  value?: string | number
  icon: React.ElementType
  tone?: 'primary' | 'green' | 'blue' | 'amber' | 'red'
}) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-emerald-500/10 text-emerald-600',
    blue: 'bg-blue-500/10 text-blue-600',
    amber: 'bg-amber-500/10 text-amber-600',
    red: 'bg-red-500/10 text-red-600',
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-bold tabular-nums text-foreground">{value ?? '-'}</span>
    </div>
  )
}

function GrowthChart({ growth }: { growth?: GrowthAnalytics }) {
  const points = growth?.series.organizations.map((point, index) => ({
    period: point.period,
    organizations: point.count,
    subscriptions: growth.series.subscriptions[index]?.count ?? 0,
    users: growth.series.users[index]?.count ?? 0,
    devices: growth.series.devices[index]?.count ?? 0,
  })) ?? []

  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={points} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dashboardGrowthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.22} />
            <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="period" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="organizations" stroke={COLORS.blue} fill="url(#dashboardGrowthFill)" strokeWidth={2} name="Organizations" />
        <Area type="monotone" dataKey="subscriptions" stroke={COLORS.emerald} fill="transparent" strokeWidth={2} name="Subscriptions" />
        <Area type="monotone" dataKey="devices" stroke={COLORS.amber} fill="transparent" strokeWidth={2} name="Devices" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function DashboardGrowthCard() {
  const growthQ = useQuery({
    queryKey: ['dashboard-analytics-growth', '30d'],
    queryFn: () => getGrowthMetrics({ period: '30d' }),
    staleTime: 60_000,
  })

  const growth = growthQ.data

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">30-Day Growth</CardTitle>
            <CardDescription>Platform growth across core objects</CardDescription>
          </div>
          {!growthQ.isLoading && <TrendPill value={growth?.change.organizations.percent} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {growthQ.isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : (
          <>
            <GrowthChart growth={growth} />
            <div className="grid gap-2 min-[420px]:grid-cols-2">
              {[
                ['Organizations', growth?.current.organizations, growth?.change.organizations.percent, 'border-blue-200 text-blue-700'],
                ['Subscriptions', growth?.current.subscriptions, growth?.change.subscriptions.percent, 'border-emerald-200 text-emerald-700'],
                ['Users', growth?.current.users, growth?.change.users.percent, 'border-violet-200 text-violet-700'],
                ['Devices', growth?.current.devices, growth?.change.devices.percent, 'border-amber-200 text-amber-700'],
              ].map(([label, value, change, classes]) => (
                <div key={label as string} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">{label}</span>
                    <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${classes}`}>
                      {(change as number) >= 0 ? '+' : ''}{change ?? 0}%
                    </Badge>
                  </div>
                  <p className="mt-1 text-lg font-bold tabular-nums">{value ?? '-'}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardAnalytics() {
  const fleetQ = useQuery({
    queryKey: ['dashboard-analytics-fleet'],
    queryFn: getFleetHealthMetrics,
    staleTime: 60_000,
  })

  const deviceQ = useQuery({
    queryKey: ['dashboard-analytics-device'],
    queryFn: getDeviceHealthMetrics,
    staleTime: 60_000,
  })

  const fleet = fleetQ.data
  const device = deviceQ.data
  const fleetCoverage = pct(fleet?.summary.with_device, fleet?.summary.total)
  const deviceOnlineRate = pct(device?.summary.online, device?.summary.total)

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fleet Operations</CardTitle>
          <CardDescription>Live movement and trip health</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fleetQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : (
            <>
              <div className="grid gap-2 min-[420px]:grid-cols-2">
                <StatRow label="Moving now" value={fleet?.movement.moving_now} icon={Truck} tone="green" />
                <StatRow label="Active today" value={fleet?.movement.active_today} icon={Activity} tone="blue" />
                <StatRow label="Trips today" value={fleet?.trips.total_today} icon={Route} tone="primary" />
                <StatRow label="In progress" value={fleet?.trips.in_progress} icon={RadioTower} tone="amber" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Fleet device coverage</span>
                  <span className="font-semibold tabular-nums">{fleetCoverage}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${fleetCoverage}%` }} />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={fleet?.status_distribution ?? []} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" name="Vehicles" radius={[3, 3, 0, 0]}>
                    {(fleet?.status_distribution ?? []).map((_, index) => (
                      <Cell key={index} fill={[COLORS.emerald, COLORS.blue, COLORS.amber, COLORS.red, COLORS.violet][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Device Health</CardTitle>
          <CardDescription>Connectivity, freshness, and signal quality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deviceQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              <div className="grid gap-2 min-[420px]:grid-cols-2">
                <StatRow label="Online" value={device?.summary.online} icon={Wifi} tone="green" />
                <StatRow label="Offline" value={device?.summary.offline} icon={WifiOff} tone="red" />
                <StatRow label="Unassigned" value={device?.summary.unassigned} icon={Cpu} tone="blue" />
                <StatRow label="Stale" value={device?.stale_devices.count} icon={AlertTriangle} tone={device?.stale_devices.count ? 'amber' : 'green'} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Online rate</span>
                  <span className="font-semibold tabular-nums">{deviceOnlineRate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${deviceOnlineRate}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                {(device?.signal_distribution ?? []).slice(0, 4).map((signal) => {
                  const width = pct(signal.count, device?.summary.total)
                  const color = signal.quality === 'excellent'
                    ? 'bg-emerald-500'
                    : signal.quality === 'good'
                      ? 'bg-blue-500'
                      : signal.quality === 'fair'
                        ? 'bg-amber-500'
                        : 'bg-red-500'

                  return (
                    <div key={signal.quality}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{signal.quality}</span>
                        <span className="font-medium tabular-nums">{signal.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
