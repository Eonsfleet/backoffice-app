'use client'

import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, Truck, Cpu, Route, BarChart2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getOrgPerformanceStats, type OrgPerformanceStats } from '@/features/organizations/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals })
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  label:     string
  value:     string | number | undefined
  sub?:      string
  icon:      React.ElementType
  iconClass?: string
  isLoading: boolean
}

function KpiCard({ label, value, sub, icon: Icon, iconClass = 'bg-primary/10 text-primary', isLoading }: KpiProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {isLoading
            ? <Skeleton className="mt-1 h-6 w-20" />
            : <p className="text-2xl font-bold tabular-nums text-foreground">{value ?? '—'}</p>
          }
          {sub && !isLoading && (
            <p className="text-xs text-muted-foreground">{sub}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Fleet status donut ────────────────────────────────────────────────────────

const FLEET_COLORS: Record<string, string> = {
  Active:      '#10b981',
  Idle:        '#f59e0b',
  Maintenance: '#6b7280',
}

function FleetStatusChart({ data, isLoading }: { data?: OrgPerformanceStats['fleet_status']; isLoading: boolean }) {
  const chartData = data
    ? [
        { name: 'Active',      value: data.active },
        { name: 'Idle',        value: data.idle },
        { name: 'Maintenance', value: data.maintenance },
      ].filter((d) => d.value > 0)
    : []

  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Fleet Status</CardTitle>
        <CardDescription>Current vehicle distribution</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="mx-auto h-36 w-36 rounded-full" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Truck className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No fleet data available</p>
          </div>
        ) : (
          <div>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={FLEET_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => {
                    const n = v as number
                    return [`${n} (${total > 0 ? Math.round((n / total) * 100) : 0}%)`, '']
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <p className="mt-1 text-center text-sm text-muted-foreground">{total} total vehicles</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Trip activity bar chart ───────────────────────────────────────────────────

function TripActivityChart({
  data,
  isLoading,
}: {
  data?: OrgPerformanceStats['trip_activity']
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trip Activity</CardTitle>
        <CardDescription>Trips and distance over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-40 w-full rounded-lg" />
            <div className="flex justify-between px-2">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-3 w-8" />)}
            </div>
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <BarChart2 className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No trip data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--popover))',
                  color: 'hsl(var(--popover-foreground))',
                }}
                cursor={{ fill: 'hsl(var(--muted))' }}
              />
              <Bar dataKey="trips" name="Trips" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="distance_km" name="Distance (km)" fill="hsl(var(--primary) / 0.35)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Top vehicles list ─────────────────────────────────────────────────────────

function TopVehiclesList({
  data,
  isLoading,
}: {
  data?: OrgPerformanceStats['top_vehicles']
  isLoading: boolean
}) {
  const max = data?.length ? Math.max(...data.map((v) => v.trips), 1) : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Vehicles</CardTitle>
        <CardDescription>Ranked by number of trips</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Truck className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No vehicle data available</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {data.map((v, idx) => {
              const pct = (v.trips / max) * 100
              const barColor =
                idx === 0 ? 'bg-primary' :
                idx === 1 ? 'bg-primary/70' :
                idx === 2 ? 'bg-primary/50' : 'bg-primary/30'
              return (
                <li key={v.plate}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-mono text-sm font-semibold uppercase text-foreground">{v.plate}</span>
                        {v.make_model && (
                          <p className="text-xs text-muted-foreground">{v.make_model}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold tabular-nums text-foreground">{fmt(v.trips)} trips</span>
                      <span className="ml-2 text-xs text-muted-foreground">{fmt(v.distance_km, 1)} km</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function OrgPerformanceTab({ identifier }: { identifier: string | number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['org-performance', identifier],
    queryFn: () => getOrgPerformanceStats(identifier),
    staleTime: 60_000,
    retry: false,
  })

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Trips"
          value={data ? fmt(data.total_trips) : undefined}
          icon={Route}
          iconClass="bg-primary/10 text-primary"
          isLoading={isLoading}
        />
        <KpiCard
          label="Distance Traveled"
          value={data ? `${fmt(data.total_distance_km, 1)} km` : undefined}
          icon={TrendingUp}
          iconClass="bg-blue-500/10 text-blue-500"
          isLoading={isLoading}
        />
        <KpiCard
          label="Active Vehicles"
          value={data ? fmt(data.active_vehicles) : undefined}
          icon={Truck}
          iconClass="bg-emerald-500/10 text-emerald-500"
          isLoading={isLoading}
        />
        <KpiCard
          label="Avg Device Uptime"
          value={data ? `${fmt(data.avg_uptime_pct, 1)}%` : undefined}
          icon={Cpu}
          iconClass="bg-amber-500/10 text-amber-500"
          isLoading={isLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TripActivityChart data={data?.trip_activity} isLoading={isLoading} />
        </div>
        <FleetStatusChart data={data?.fleet_status} isLoading={isLoading} />
      </div>

      {/* Top vehicles */}
      <TopVehiclesList data={data?.top_vehicles} isLoading={isLoading} />
    </div>
  )
}
