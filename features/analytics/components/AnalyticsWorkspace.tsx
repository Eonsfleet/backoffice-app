'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Car,
  CheckCircle2,
  CircleDashed,
  Clock,
  Cpu,
  CreditCard,
  Gauge,
  Minus,
  Radio,
  Route,
  Server,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  getDeviceHealthMetrics,
  getFleetHealthMetrics,
  getGrowthMetrics,
  type GrowthAnalytics,
} from '@/features/analytics/api'

const CHART_COLORS = {
  blue: '#2563eb',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  slate: '#64748b',
}

const growthItems = [
  { key: 'organizations', label: 'Organizations', icon: Building2, color: CHART_COLORS.blue, tone: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard, color: CHART_COLORS.emerald, tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  { key: 'users', label: 'Users', icon: Users, color: CHART_COLORS.violet, tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  { key: 'devices', label: 'Devices', icon: Server, color: CHART_COLORS.amber, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
] as const

type GrowthKey = typeof growthItems[number]['key']

function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat().format(value)
}

function formatKm(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '-'
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)} km`
}

function percent(part?: number | null, total?: number | null) {
  if (!part || !total) return 0
  return Math.round((part / total) * 100)
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

function compactPeriod(value: string) {
  return value.length > 5 ? value.slice(5) : value
}

function mergeGrowthSeries(growth?: GrowthAnalytics) {
  if (!growth?.series) return []

  const periods = new Set<string>()
  growthItems.forEach(({ key }) => {
    growth.series[key].forEach((point) => periods.add(point.period))
  })

  return Array.from(periods)
    .sort()
    .map((period) => {
      const row: Record<string, string | number> = {
        period,
        label: compactPeriod(period),
      }

      growthItems.forEach(({ key }) => {
        row[key] = growth.series[key].find((point) => point.period === period)?.count ?? 0
      })

      return row
    })
}

function updatedLabel(timestamp?: number) {
  if (!timestamp) return 'Waiting for data'
  return `Updated ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}`
}

function MiniProgress({
  value,
  color,
}: {
  value: number
  color: string
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  isLoading,
}: {
  label: string
  value?: string | number
  detail?: string
  icon: React.ComponentType<{ className?: string }>
  tone: string
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="truncate text-2xl font-bold tracking-tight tabular-nums text-foreground">{value ?? '-'}</p>
            {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TrendBadge({ value }: { value?: number }) {
  if (value == null) return <span className="text-xs text-muted-foreground">No comparison</span>

  const isUp = value > 0
  const isDown = value < 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isUp && 'text-emerald-600 dark:text-emerald-400',
        isDown && 'text-rose-600 dark:text-rose-400',
        !isUp && !isDown && 'text-muted-foreground',
      )}
    >
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : isDown ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {isUp ? '+' : ''}{value}% vs previous period
    </span>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
      {label}
    </div>
  )
}

export default function AnalyticsPage() {
  const [growthPeriod, setGrowthPeriod] = useState('30d')

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
    queryKey: ['analytics-growth', growthPeriod],
    queryFn: () => getGrowthMetrics({ period: growthPeriod }),
    staleTime: 60_000,
  })

  const fleet = fleetQ.data
  const device = deviceQ.data
  const growth = growthQ.data

  const coverageRate = percent(fleet?.summary.with_device, fleet?.summary.total)
  const onlineRate = percent(fleet?.summary.device_online, fleet?.summary.with_device)
  const activeFleetRate = percent(fleet?.movement.active_today, fleet?.summary.total)
  const staleRate = percent(device?.stale_devices.count, device?.summary.total)
  const assignedDeviceRate = percent((device?.summary.total ?? 0) - (device?.summary.unassigned ?? 0), device?.summary.total)
  const signalTotal = device?.signal_distribution.reduce((sum, item) => sum + item.count, 0) ?? 0
  const latestUpdate = Math.max(fleetQ.dataUpdatedAt, deviceQ.dataUpdatedAt, growthQ.dataUpdatedAt)

  const growthSeries = useMemo(() => mergeGrowthSeries(growth), [growth])

  const attentionItems = [
    {
      label: 'Vehicles without devices',
      value: fleet?.summary.no_device ?? 0,
      detail: `${100 - coverageRate}% of fleet needs device coverage`,
      icon: Car,
      tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
      severity: (fleet?.summary.no_device ?? 0) > 0 ? 'warning' : 'ok',
    },
    {
      label: 'Offline vehicle devices',
      value: fleet?.summary.device_offline ?? 0,
      detail: `${100 - onlineRate}% of assigned fleet is offline`,
      icon: WifiOff,
      tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
      severity: (fleet?.summary.device_offline ?? 0) > 0 ? 'warning' : 'ok',
    },
    {
      label: 'Stale device records',
      value: device?.stale_devices.count ?? 0,
      detail: `No signal for ${device?.stale_devices.threshold_days ?? '-'}+ days`,
      icon: Clock,
      tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
      severity: (device?.stale_devices.count ?? 0) > 0 ? 'warning' : 'ok',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Fleet health, platform growth, device reliability, and operational signals in one view."
        icon={BarChart3}
        actions={
          <Badge variant="outline" className="h-8 rounded-md px-3 font-normal">
            {updatedLabel(latestUpdate)}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Fleet Coverage"
          value={`${coverageRate}%`}
          detail={`${formatNumber(fleet?.summary.with_device)} of ${formatNumber(fleet?.summary.total)} vehicles have devices`}
          icon={ShieldCheck}
          tone="bg-blue-500/10 text-blue-700 dark:text-blue-300"
          isLoading={fleetQ.isLoading}
        />
        <MetricTile
          label="Online Device Rate"
          value={`${onlineRate}%`}
          detail={`${formatNumber(fleet?.summary.device_online)} online, ${formatNumber(fleet?.summary.device_offline)} offline`}
          icon={Wifi}
          tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          isLoading={fleetQ.isLoading}
        />
        <MetricTile
          label="Fleet Active Today"
          value={`${activeFleetRate}%`}
          detail={`${formatNumber(fleet?.movement.active_today)} active, ${formatNumber(fleet?.movement.moving_now)} moving now`}
          icon={Activity}
          tone="bg-violet-500/10 text-violet-700 dark:text-violet-300"
          isLoading={fleetQ.isLoading}
        />
        <MetricTile
          label="Stale Device Risk"
          value={`${staleRate}%`}
          detail={`${formatNumber(device?.stale_devices.count)} devices need attention`}
          icon={AlertTriangle}
          tone="bg-amber-500/10 text-amber-700 dark:text-amber-300"
          isLoading={deviceQ.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Growth Intelligence</CardTitle>
              <CardDescription>New platform activity grouped by {growth?.group_by ?? 'period'}.</CardDescription>
            </div>
            <Select value={growthPeriod} onValueChange={setGrowthPeriod}>
              <SelectTrigger className="h-9 w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {growthQ.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : growthSeries.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthSeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} labelFormatter={(_, payload) => payload?.[0]?.payload?.period ?? ''} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {growthItems.map(({ key, label, color }) => (
                      <Line key={key} type="monotone" dataKey={key} stroke={color} dot={false} strokeWidth={2.25} name={label} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState label="No growth data available for this period." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Period Movement</CardTitle>
            <CardDescription>Current totals compared with the previous period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {growthQ.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)
            ) : growthItems.map(({ key, label, icon: Icon, tone }) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', tone)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{label}</p>
                    <TrendBadge value={growth?.change[key as GrowthKey].percent} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums">{formatNumber(growth?.current[key as GrowthKey])}</p>
                  <p className="text-xs text-muted-foreground">{growth?.change[key as GrowthKey].value ?? 0} net</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Fleet Operations</CardTitle>
            <CardDescription>Trips, movement, and assignment coverage.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fleetQ.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Device coverage</span>
                      <span className="font-semibold tabular-nums">{coverageRate}%</span>
                    </div>
                    <MiniProgress value={coverageRate} color="bg-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Assigned devices online</span>
                      <span className="font-semibold tabular-nums">{onlineRate}%</span>
                    </div>
                    <MiniProgress value={onlineRate} color="bg-emerald-500" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <div className="rounded-md border border-border p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Route className="h-3.5 w-3.5" />
                        Trips Today
                      </div>
                      <p className="text-xl font-bold tabular-nums">{formatNumber(fleet?.trips.total_today)}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(fleet?.trips.in_progress)} in progress</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Gauge className="h-3.5 w-3.5" />
                        Month Distance
                      </div>
                      <p className="text-xl font-bold tabular-nums">{formatKm(fleet?.trips.total_distance_km_this_month)}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(fleet?.trips.completed_this_month)} completed trips</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Vehicle Status</CardTitle>
            <CardDescription>Fleet distribution by current status.</CardDescription>
          </CardHeader>
          <CardContent>
            {fleetQ.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : fleet?.status_distribution.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fleet.status_distribution} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="status" width={92} tick={{ fontSize: 11 }} tickFormatter={titleCase} />
                    <Tooltip contentStyle={{ fontSize: 12 }} labelFormatter={(label) => titleCase(String(label))} />
                    <Bar dataKey="count" fill={CHART_COLORS.blue} name="Vehicles" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState label="No vehicle status data available." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Attention Queue</CardTitle>
            <CardDescription>Items most likely to affect operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fleetQ.isLoading || deviceQ.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)
            ) : attentionItems.map(({ label, value, detail, icon: Icon, tone, severity }) => (
              <div key={label} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', tone)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                    </div>
                  </div>
                  <Badge variant={severity === 'ok' ? 'secondary' : 'outline'} className="rounded-md tabular-nums">
                    {formatNumber(value)}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Signal Quality</CardTitle>
            <CardDescription>Device signal distribution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deviceQ.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)
            ) : device?.signal_distribution.length ? (
              device.signal_distribution.map((signal) => {
                const share = percent(signal.count, signalTotal || device.summary.total)
                const color =
                  signal.quality === 'excellent'
                    ? 'bg-emerald-500'
                    : signal.quality === 'good'
                      ? 'bg-blue-500'
                      : signal.quality === 'fair'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'

                return (
                  <div key={signal.quality} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <Radio className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium capitalize">{signal.quality}</span>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatNumber(signal.count)}</span>
                    </div>
                    <MiniProgress value={share} color={color} />
                    <p className="text-xs text-muted-foreground">{signal.range}</p>
                  </div>
                )
              })
            ) : (
              <EmptyState label="No signal quality data available." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Device Reliability</CardTitle>
            <CardDescription>Connectivity freshness and assignment health.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {deviceQ.isLoading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-48 w-full" />
              </>
            ) : (
              <>
                <div className="grid gap-3 min-[420px]:grid-cols-2">
                  <div className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Cpu className="h-3.5 w-3.5" />
                      Total Devices
                    </div>
                    <p className="text-xl font-bold tabular-nums">{formatNumber(device?.summary.total)}</p>
                    <p className="text-xs text-muted-foreground">{assignedDeviceRate}% assigned</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <CircleDashed className="h-3.5 w-3.5" />
                      Unassigned
                    </div>
                    <p className="text-xl font-bold tabular-nums">{formatNumber(device?.summary.unassigned)}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(device?.summary.offline)} offline</p>
                  </div>
                </div>

                {device?.last_seen_buckets.length ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={device.last_seen_buckets} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="bucket" width={92} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="count" name="Devices" radius={[0, 4, 4, 0]}>
                          {device.last_seen_buckets.map((_, index) => (
                            <Cell
                              key={index}
                              fill={index === 0 ? CHART_COLORS.emerald : index <= 2 ? CHART_COLORS.amber : CHART_COLORS.rose}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState label="No last-seen data available." />
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Stale Devices</CardTitle>
            <CardDescription>Device identifiers with outdated connectivity records.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Stale Devices</p>
                  <p className="text-xs text-muted-foreground">
                    Older than {device?.stale_devices.threshold_days ?? '-'} days
                  </p>
                </div>
                <Badge variant="outline" className="rounded-md tabular-nums">
                  {formatNumber(device?.stale_devices.count)}
                </Badge>
              </div>

              {deviceQ.isLoading ? (
                <Skeleton className="h-28 w-full" />
              ) : device?.stale_devices.devices.length ? (
                <div className="flex max-h-48 flex-wrap gap-2 overflow-auto pr-1">
                  {device.stale_devices.devices.slice(0, 24).map((staleDevice) => (
                    <Badge key={staleDevice.id} variant="secondary" className="rounded-md font-mono text-xs">
                      {staleDevice.device_id ?? staleDevice.id}
                    </Badge>
                  ))}
                  {device.stale_devices.count > 24 && (
                    <Badge variant="outline" className="rounded-md text-xs">
                      +{device.stale_devices.count - 24} more
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="flex h-28 items-center justify-center rounded-md bg-muted/40 text-sm text-muted-foreground">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                  No stale devices
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
