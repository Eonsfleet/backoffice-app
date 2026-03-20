'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Activity, Cpu, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const [deviceDays, setDeviceDays] = useState('30')

  const fleetQ = useQuery({
    queryKey: ['analytics-fleet'],
    queryFn: getFleetHealthMetrics,
    staleTime: 60_000,
  })

  const deviceQ = useQuery({
    queryKey: ['analytics-device', deviceDays],
    queryFn: () => getDeviceHealthMetrics({ days: Number(deviceDays) }),
    staleTime: 60_000,
  })

  const growthQ = useQuery({
    queryKey: ['analytics-growth', growthMonths],
    queryFn: () => getGrowthMetrics({ months: Number(growthMonths) }),
    staleTime: 60_000,
  })

  const fleet = fleetQ.data
  const device = deviceQ.data
  const growth = growthQ.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Business intelligence, growth metrics, and fleet performance insights."
        icon={BarChart3}
      />

      {/* Fleet Health KPIs */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fleet Health</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Maintenance Alerts"
            value={fleet?.maintenance_alerts_total ?? '—'}
            icon={AlertTriangle}
            iconClassName="bg-amber-500/10"
            isLoading={fleetQ.isLoading}
          />
          <KpiCard
            label="Open Incidents"
            value={fleet?.open_incidents ?? '—'}
            icon={Activity}
            iconClassName="bg-red-500/10"
            isLoading={fleetQ.isLoading}
          />
          <KpiCard
            label="Trip Completion Rate"
            value={fleet?.trip_completion_rate != null ? `${fleet.trip_completion_rate}%` : '—'}
            icon={CheckCircle2}
            iconClassName="bg-emerald-500/10"
            isLoading={fleetQ.isLoading}
          />
          <KpiCard
            label="Resolved Incidents"
            value={fleet?.resolved_incidents ?? '—'}
            icon={CheckCircle2}
            iconClassName="bg-blue-500/10"
            isLoading={fleetQ.isLoading}
          />
        </div>
      </div>

      {/* Maintenance alerts breakdown */}
      {fleet?.maintenance_by_status && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(fleet.maintenance_by_status as Record<string, number>).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm text-muted-foreground capitalize">{status.replace(/_/g, ' ')}</span>
              <Badge variant="secondary">{count}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Device Health */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Device Health</h2>
          <Select value={deviceDays} onValueChange={setDeviceDays}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7d</SelectItem>
              <SelectItem value="14">Last 14d</SelectItem>
              <SelectItem value="30">Last 30d</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <KpiCard
            label="Online Rate"
            value={device?.online_rate != null ? `${device.online_rate}%` : '—'}
            icon={Cpu}
            iconClassName="bg-emerald-500/10"
            isLoading={deviceQ.isLoading}
          />
          <KpiCard
            label="Devices Offline >24h"
            value={device?.offline_over_24h ?? '—'}
            icon={AlertTriangle}
            iconClassName="bg-red-500/10"
            isLoading={deviceQ.isLoading}
          />
          <KpiCard
            label="Firmware Versions"
            value={device?.firmware_versions_count ?? '—'}
            icon={Cpu}
            iconClassName="bg-violet-500/10"
            isLoading={deviceQ.isLoading}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartCard title="Online vs Offline Over Time" isLoading={deviceQ.isLoading}>
            {device?.timeline && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={device.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="online" fill={CHART_COLORS.emerald} stroke={CHART_COLORS.emerald} fillOpacity={0.2} name="Online" />
                  <Area type="monotone" dataKey="offline" fill={CHART_COLORS.red} stroke={CHART_COLORS.red} fillOpacity={0.2} name="Offline" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Firmware Version Distribution" isLoading={deviceQ.isLoading}>
            {device?.firmware_distribution && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={device.firmware_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="version" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" fill={CHART_COLORS.violet} name="Devices" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
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
