'use client'

import { Activity, CalendarCheck, Car, Gauge, Navigation, Route, Timer } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FleetHealth } from '@/features/analytics/api'
import { formatKm, formatNumber, formatPercent, percent, titleCase, type ReportRates } from '@/features/analytics/report'
import {
  BreakdownTable,
  CHART_AXIS,
  CHART_GRID,
  ChartTooltip,
  InlineEmpty,
  MeterRow,
  ReportSection,
  SectionSkeleton,
  StatBlock,
  type BreakdownRow,
} from './report-ui'

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  available: '#10b981',
  in_transit: '#2563eb',
  moving: '#2563eb',
  idle: '#0d9488',
  maintenance: '#d97706',
  repair: '#d97706',
  inactive: '#64748b',
  suspended: '#dc2626',
  decommissioned: '#94a3b8',
}
const FALLBACK_COLORS = ['#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c']

function statusRows(fleet: FleetHealth): BreakdownRow[] {
  let fallback = 0
  return fleet.status_distribution.map((s) => ({
    key: s.status,
    label: titleCase(s.status),
    count: s.count,
    color: STATUS_COLORS[s.status] ?? FALLBACK_COLORS[fallback++ % FALLBACK_COLORS.length],
  }))
}

/** Total → equipped → online → active today → moving now, each step as a share of the whole fleet. */
export function TrackingPipeline({ fleet, isLoading }: { fleet?: FleetHealth; isLoading: boolean }) {
  if (isLoading || !fleet) return <SectionSkeleton rows={1} />
  const total = fleet.summary.total
  const steps = [
    { label: 'Registered vehicles', value: total, note: 'All vehicles on the platform' },
    { label: 'Fitted with a device', value: fleet.summary.with_device, note: `${formatNumber(fleet.summary.no_device)} without` },
    { label: 'Device online', value: fleet.summary.device_online, note: `${formatNumber(fleet.summary.device_offline)} offline` },
    { label: 'Active today', value: fleet.movement.active_today, note: 'Sent at least one location today' },
    { label: 'Moving now', value: fleet.movement.moving_now, note: 'Speed above zero in the last 30 min' },
  ]
  return (
    <ol className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((step, index) => {
        const share = index === 0 ? 100 : percent(step.value, total)
        return (
          <li key={step.label} className="relative bg-card px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{index + 1}</span>
              {step.label}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{formatNumber(step.value)}</p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${share ?? 0}%` }} />
            </div>
            <p className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{step.note}</span>
              <span className="shrink-0 font-medium tabular-nums text-foreground">{formatPercent(share)}</span>
            </p>
          </li>
        )
      })}
    </ol>
  )
}

export function FleetReport({ fleet, rates, isLoading }: { fleet?: FleetHealth; rates: ReportRates; isLoading: boolean }) {
  const rows = fleet ? statusRows(fleet) : []

  return (
    <div className="space-y-4">
      <ReportSection title="Tracking pipeline" description="How much of the fleet is equipped, connected and in use right now.">
        <TrackingPipeline fleet={fleet} isLoading={isLoading} />
      </ReportSection>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <ReportSection title="Vehicle status" description="Current status of every registered vehicle.">
          {isLoading ? <SectionSkeleton chart /> : rows.length ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID} />
                    <XAxis type="number" tick={CHART_AXIS} allowDecimals={false} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" width={96} tick={CHART_AXIS} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Vehicles" radius={[0, 4, 4, 0]} barSize={18}>
                      {rows.map((row) => <Cell key={row.key} fill={row.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <BreakdownTable rows={rows} unit="Vehicles" caption="Vehicles by status" />
            </div>
          ) : <InlineEmpty>No vehicle status data yet.</InlineEmpty>}
        </ReportSection>

        <ReportSection title="Utilisation today" description="Live movement across the platform.">
          {isLoading || !fleet ? <SectionSkeleton rows={4} /> : (
            <div className="space-y-5">
              <dl className="grid grid-cols-3 gap-3">
                <StatBlock label="Moving" icon={Navigation} value={formatNumber(fleet.movement.moving_now)} />
                <StatBlock label="Active" icon={Activity} value={formatNumber(fleet.movement.active_today)} />
                <StatBlock label="Idle" icon={Timer} value={formatNumber(fleet.movement.inactive_today)} />
              </dl>
              <MeterRow label="Fleet active today" value={rates.activeToday} className="bg-violet-500" detail="Vehicles that sent at least one location since midnight." />
              <MeterRow label="Device coverage" value={rates.coverage} className="bg-blue-500" detail={`${formatNumber(fleet.summary.with_device)} of ${formatNumber(fleet.summary.total)} vehicles fitted.`} />
              <MeterRow label="Tracked vehicles online" value={rates.online} className="bg-emerald-500" detail={`${formatNumber(fleet.summary.device_offline)} fitted vehicles are offline.`} />
            </div>
          )}
        </ReportSection>
      </div>

      <ReportSection title="Trips and distance" description="Trip activity today and for the current calendar month.">
        {isLoading || !fleet ? <SectionSkeleton rows={1} /> : (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatBlock label="Trips today" icon={Route} value={formatNumber(fleet.trips.total_today)} hint="Started since midnight" />
            <StatBlock label="In progress" icon={Car} value={formatNumber(fleet.trips.in_progress)} hint="Currently in transit" />
            <StatBlock label="Completed this month" icon={CalendarCheck} value={formatNumber(fleet.trips.completed_this_month)} hint="Since the 1st of the month" />
            <StatBlock label="Distance this month" icon={Gauge} value={formatKm(fleet.trips.total_distance_km_this_month)} hint="Trusted days only; may not cover the whole month" />
          </dl>
        )}
      </ReportSection>
    </div>
  )
}
