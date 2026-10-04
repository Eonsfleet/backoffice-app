'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import { CheckCircle2, CircleDashed, Cpu, ExternalLink, Search, Wifi, WifiOff } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Timestamp } from '@/components/shared/Timestamp'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DeviceHealth } from '@/features/analytics/api'
import { formatNumber, formatPercent, percent, STALE_THRESHOLDS, titleCase, type ReportRates } from '@/features/analytics/report'
import {
  BreakdownTable,
  CHART_AXIS,
  CHART_GRID,
  ChartTooltip,
  InlineEmpty,
  ReportSection,
  SectionSkeleton,
  StatBlock,
  type BreakdownRow,
} from './report-ui'

const LAST_SEEN_COLORS = ['#10b981', '#22c55e', '#84cc16', '#f59e0b', '#dc2626', '#94a3b8']
const SIGNAL_COLORS: Record<string, string> = { excellent: '#10b981', good: '#2563eb', fair: '#f59e0b', poor: '#dc2626' }

function lastSeenLabel(bucket: string) {
  return bucket === 'never' ? 'Never reported' : bucket
}

export function DevicesReport({
  device,
  rates,
  isLoading,
  staleDays,
  onStaleDaysChange,
}: {
  device?: DeviceHealth
  rates: ReportRates
  isLoading: boolean
  staleDays: number
  onStaleDaysChange: (days: number) => void
}) {
  const [search, setSearch] = useState('')

  const lastSeenRows: BreakdownRow[] = device?.last_seen_buckets.map((b, index) => ({
    key: b.bucket,
    label: lastSeenLabel(b.bucket),
    count: b.count,
    color: LAST_SEEN_COLORS[index] ?? '#94a3b8',
  })) ?? []

  const signalRows: BreakdownRow[] = device?.signal_distribution.map((s) => ({
    key: s.quality,
    label: titleCase(s.quality),
    sublabel: s.range,
    count: s.count,
    color: SIGNAL_COLORS[s.quality] ?? '#94a3b8',
  })) ?? []
  const signalTotal = signalRows.reduce((sum, row) => sum + row.count, 0)

  const staleDevices = useMemo(() => {
    const list = device?.stale_devices.devices ?? []
    const term = search.trim().toLowerCase()
    if (!term) return list
    return list.filter((d) => d.imei.toLowerCase().includes(term) || d.organization?.toLowerCase().includes(term))
  }, [device, search])

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !device ? Array.from({ length: 4 }).map((_, i) => <SectionSkeleton key={i} rows={1} />) : <>
          <StatBlock className="bg-card" label="Total devices" icon={Cpu} value={formatNumber(device.summary.total)} hint={`${formatPercent(rates.assignedDevices)} linked to an organization`} />
          <StatBlock className="bg-card" label="Online" icon={Wifi} value={formatNumber(device.summary.online)} hint={`${formatPercent(percent(device.summary.online, device.summary.total))} of all devices`} />
          <StatBlock className="bg-card" label="Offline" icon={WifiOff} value={formatNumber(device.summary.offline)} hint={<Link href="/devices?status=offline" className="text-primary hover:underline">View offline devices</Link>} />
          <StatBlock className="bg-card" label="Unassigned" icon={CircleDashed} value={formatNumber(device.summary.unassigned)} hint="Not linked to any organization" />
        </>}
      </dl>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Connectivity freshness" description="Time since each device last sent a packet.">
          {isLoading ? <SectionSkeleton chart /> : lastSeenRows.length ? (
            <div className="space-y-5">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lastSeenRows} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                    <XAxis dataKey="label" tick={CHART_AXIS} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={CHART_AXIS} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Devices" radius={[4, 4, 0, 0]} maxBarSize={44}>
                      {lastSeenRows.map((row) => <Cell key={row.key} fill={row.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <BreakdownTable rows={lastSeenRows} unit="Devices" caption="Devices by time since last packet" />
            </div>
          ) : <InlineEmpty>No connectivity data yet.</InlineEmpty>}
        </ReportSection>

        <ReportSection title="Signal quality" description="Latest RSSI reading per device over the last 24 hours.">
          {isLoading ? <SectionSkeleton chart /> : signalTotal ? (
            <div className="space-y-5">
              <div>
                <div className="flex h-8 w-full overflow-hidden rounded-md" role="img" aria-label="Signal quality distribution">
                  {signalRows.filter((row) => row.count > 0).map((row) => (
                    <div
                      key={row.key}
                      title={`${row.label}: ${formatNumber(row.count)}`}
                      className="flex items-center justify-center text-[11px] font-semibold text-white transition-[width] duration-500"
                      style={{ width: `${(row.count / signalTotal) * 100}%`, backgroundColor: row.color }}
                    >
                      {(row.count / signalTotal) >= 0.08 ? `${percent(row.count, signalTotal)}%` : ''}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatNumber(signalTotal)} of {formatNumber(device?.summary.total)} devices reported a signal reading in the last 24 hours.
                </p>
              </div>
              <BreakdownTable rows={signalRows} unit="Devices" caption="Devices by signal quality" />
            </div>
          ) : <InlineEmpty>No signal readings in the last 24 hours.</InlineEmpty>}
        </ReportSection>
      </div>

      <ReportSection
        title="Stale devices"
        description={device
          ? `${formatNumber(device.stale_devices.count)} devices have not reported for ${device.stale_devices.threshold_days}+ days, oldest first.`
          : 'Devices that have stopped reporting.'}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter IMEI or organization" aria-label="Filter stale devices" className="h-9 pl-8 sm:w-60" />
            </div>
            <Select value={String(staleDays)} onValueChange={(v) => onStaleDaysChange(Number(v))}>
              <SelectTrigger className="h-9 sm:w-40" aria-label="Stale threshold"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STALE_THRESHOLDS.map((days) => <SelectItem key={days} value={String(days)}>Silent {days}+ days</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
        contentClassName="p-0"
      >
        {isLoading ? <div className="p-5"><SectionSkeleton rows={4} /></div> : !device?.stale_devices.count ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-status-success" />
            Every device has reported within the last {staleDays} days.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Devices that have not reported recently</caption>
              <thead className="bg-muted/40">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 font-medium">IMEI</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Organization</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Silent for</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Last packet</th>
                  <th scope="col" className="px-5 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {staleDevices.map((d) => (
                  <tr key={d.imei} className="border-t transition-colors hover:bg-muted/30">
                    <td className="px-5 py-2.5 font-mono text-xs">{d.imei}</td>
                    <td className="px-5 py-2.5">{d.organization ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                    <td className="px-5 py-2.5 tabular-nums">{d.last_seen ? formatDistanceToNowStrict(new Date(d.last_seen)) : '—'}</td>
                    <td className="px-5 py-2.5"><Timestamp value={d.last_seen} /></td>
                    <td className="px-5 py-2.5 text-right">
                      <Link href={`/devices?q=${encodeURIComponent(d.imei)}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        Open <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {!staleDevices.length && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No stale devices match “{search}”.</td></tr>
                )}
              </tbody>
            </table>
            {device.stale_devices.count > device.stale_devices.devices.length && (
              <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">
                Showing the {formatNumber(device.stale_devices.devices.length)} longest-silent of {formatNumber(device.stale_devices.count)} stale devices.
              </p>
            )}
          </div>
        )}
      </ReportSection>
    </div>
  )
}
