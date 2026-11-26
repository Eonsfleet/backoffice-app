'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, BarChart3, Download, RefreshCw, ShieldCheck, Wifi } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryError } from '@/components/shared/QueryError'
import { Timestamp } from '@/components/shared/Timestamp'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  getDeviceHealthMetrics,
  getFleetHealthMetrics,
  getGrowthMetrics,
  type GrowthPeriod,
} from '@/features/analytics/api'
import {
  buildFindings,
  buildReportCsv,
  computeRates,
  formatNumber,
  formatPercent,
  GROWTH_PERIODS,
  readinessLabel,
  readinessScore,
  readinessSeverity,
} from '@/features/analytics/report'
import { DevicesReport } from './DevicesReport'
import { FleetReport } from './FleetReport'
import { GrowthReport } from './GrowthReport'
import { OverviewReport } from './OverviewReport'
import { Meter, SEVERITY_STYLES } from './report-ui'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'fleet', label: 'Fleet' },
  { value: 'devices', label: 'Devices' },
  { value: 'growth', label: 'Growth' },
] as const
type Tab = typeof TABS[number]['value']

const isTab = (value: string | null): value is Tab => TABS.some((t) => t.value === value)
const isPeriod = (value: string | null): value is GrowthPeriod => GROWTH_PERIODS.some((p) => p.value === value)

function setUrlParam(name: string, value: string | null) {
  const url = new URL(window.location.href)
  if (value === null) url.searchParams.delete(name)
  else url.searchParams.set(name, value)
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

function ReadinessRing({ score }: { score: number | null }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - (score ?? 0) / 100)
  const style = SEVERITY_STYLES[readinessSeverity(score)]
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="50" cy="50" r={radius} fill="none" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className={cn('transition-[stroke-dashoffset] duration-700', style.text)}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">{score ?? '—'}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">of 100</span>
      </div>
    </div>
  )
}

function KpiTile({
  label,
  value,
  detail,
  icon: Icon,
  rate,
  barClassName,
  isLoading,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Activity
  rate: number | null
  barClassName: string
  isLoading: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-3 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
      </div>
      {isLoading ? <div className="space-y-2"><Skeleton className="h-7 w-20" /><Skeleton className="h-3 w-full" /></div> : <>
        <div>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={detail}>{detail}</p>
        </div>
        <Meter value={rate} className={barClassName} label={label} />
      </>}
    </div>
  )
}

function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function OperationalReportsWorkspace() {
  const params = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => (isTab(params.get('tab')) ? params.get('tab') as Tab : 'overview'))
  const [period, setPeriod] = useState<GrowthPeriod>(() => (isPeriod(params.get('period')) ? params.get('period') as GrowthPeriod : '30d'))
  const [staleDays, setStaleDays] = useState(7)

  const fleetQ = useQuery({ queryKey: ['analytics-fleet'], queryFn: () => getFleetHealthMetrics(), staleTime: 60_000 })
  const deviceQ = useQuery({
    queryKey: ['analytics-device', staleDays],
    queryFn: () => getDeviceHealthMetrics({ stale_days: staleDays }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
  const growthQ = useQuery({
    queryKey: ['analytics-growth', period],
    queryFn: () => getGrowthMetrics({ period }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  const fleet = fleetQ.data
  const device = deviceQ.data
  const growth = growthQ.data
  const snapshotLoading = fleetQ.isPending || deviceQ.isPending

  const rates = useMemo(() => computeRates(fleet, device), [fleet, device])
  const score = readinessScore(rates)
  const severity = readinessSeverity(score)
  const findings = useMemo(() => buildFindings(fleet, device, growth), [fleet, device, growth])
  const latestUpdate = Math.max(fleetQ.dataUpdatedAt, deviceQ.dataUpdatedAt, growthQ.dataUpdatedAt)
  const isFetching = fleetQ.isFetching || deviceQ.isFetching || growthQ.isFetching
  const periodLabel = GROWTH_PERIODS.find((p) => p.value === period)?.label.toLowerCase() ?? ''

  const changeTab = (value: string) => {
    if (!isTab(value)) return
    setTab(value)
    setUrlParam('tab', value === 'overview' ? null : value)
  }
  const changePeriod = (value: GrowthPeriod) => {
    setPeriod(value)
    setUrlParam('period', value === '30d' ? null : value)
  }
  const refresh = () => { void fleetQ.refetch(); void deviceQ.refetch(); void growthQ.refetch() }
  const exportCsv = () => {
    const now = new Date()
    downloadCsv(buildReportCsv(fleet, device, growth, now), `operational-report-${now.toISOString().slice(0, 10)}.csv`)
  }

  const errors = [
    fleetQ.isError && { key: 'fleet', error: fleetQ.error, retry: fleetQ.refetch, label: 'fleet health' },
    deviceQ.isError && { key: 'device', error: deviceQ.error, retry: deviceQ.refetch, label: 'device health' },
    growthQ.isError && { key: 'growth', error: growthQ.error, retry: growthQ.refetch, label: 'growth analytics' },
  ].filter(Boolean) as { key: string; error: unknown; retry: () => unknown; label: string }[]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational reports"
        description="Platform-wide fleet coverage, device reliability and growth, with the issues that need action."
        icon={BarChart3}
        actions={<>
          <span className="mr-1 hidden items-center gap-1.5 text-xs text-muted-foreground md:inline-flex">
            Snapshot {latestUpdate ? <Timestamp value={new Date(latestUpdate).toISOString()} /> : 'loading…'}
          </span>
          <Button variant="outline" size="sm" onClick={refresh} disabled={isFetching}>
            <RefreshCw aria-hidden="true" className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />Refresh
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={snapshotLoading}>
            <Download aria-hidden="true" className="mr-2 h-4 w-4" />Export CSV
          </Button>
        </>}
      />

      {errors.map((e) => <QueryError key={e.key} error={e.error} retry={() => void e.retry()} label={e.label} />)}

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="grid p-0 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="flex items-center gap-5 border-b p-5 lg:border-b-0 lg:border-r">
            {snapshotLoading ? <Skeleton className="h-28 w-28 rounded-full" /> : <ReadinessRing score={score} />}
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Operational readiness</p>
              {snapshotLoading ? <Skeleton className="h-6 w-32" /> : (
                <p className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm font-semibold', SEVERITY_STYLES[severity].surface, SEVERITY_STYLES[severity].text)}>
                  {readinessLabel(score)}
                </p>
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                Average of device coverage ({formatPercent(rates.coverage)}), online rate ({formatPercent(rates.online)}) and 24-hour freshness ({formatPercent(rates.freshness)}).
              </p>
            </div>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Device coverage" icon={ShieldCheck} isLoading={fleetQ.isPending}
              value={formatPercent(rates.coverage)} rate={rates.coverage} barClassName="bg-blue-500"
              detail={`${formatNumber(fleet?.summary.with_device)} of ${formatNumber(fleet?.summary.total)} vehicles fitted`}
            />
            <KpiTile
              label="Online rate" icon={Wifi} isLoading={fleetQ.isPending}
              value={formatPercent(rates.online)} rate={rates.online} barClassName="bg-emerald-500"
              detail={`${formatNumber(fleet?.summary.device_online)} online · ${formatNumber(fleet?.summary.device_offline)} offline`}
            />
            <KpiTile
              label="Active today" icon={Activity} isLoading={fleetQ.isPending}
              value={formatPercent(rates.activeToday)} rate={rates.activeToday} barClassName="bg-violet-500"
              detail={`${formatNumber(fleet?.movement.active_today)} active · ${formatNumber(fleet?.movement.moving_now)} moving now`}
            />
            <KpiTile
              label="Stale devices" icon={AlertTriangle} isLoading={deviceQ.isPending}
              value={formatNumber(device?.stale_devices.count)} rate={rates.stale} barClassName="bg-amber-500"
              detail={`${formatPercent(rates.stale)} silent for ${device?.stale_devices.threshold_days ?? staleDays}+ days`}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={changeTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="h-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
            {TABS.map((t) => {
              const count = t.value === 'overview' ? findings.filter((f) => f.severity === 'critical' || f.severity === 'warning').length : 0
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="-mb-px gap-2 rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  {t.label}
                  {count > 0 && <span className="rounded-full bg-status-warning-surface px-1.5 text-[10px] font-semibold tabular-nums text-status-warning">{count}</span>}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0">
          <OverviewReport
            findings={findings}
            fleet={fleet}
            growth={growth}
            isLoading={snapshotLoading}
            isGrowthLoading={growthQ.isPending}
            periodLabel={periodLabel}
            onOpenGrowth={() => changeTab('growth')}
          />
        </TabsContent>
        <TabsContent value="fleet" className="mt-0">
          <FleetReport fleet={fleet} rates={rates} isLoading={fleetQ.isPending} />
        </TabsContent>
        <TabsContent value="devices" className="mt-0">
          <DevicesReport device={device} rates={rates} isLoading={deviceQ.isPending} staleDays={staleDays} onStaleDaysChange={setStaleDays} />
        </TabsContent>
        <TabsContent value="growth" className="mt-0">
          <GrowthReport growth={growth} isLoading={growthQ.isPending} period={period} onPeriodChange={changePeriod} />
        </TabsContent>
      </Tabs>

      <p className="text-xs leading-5 text-muted-foreground">
        Fleet and device figures are a live platform-wide snapshot. Trip distance counts only days with trusted platform mileage this calendar month, so it may not cover the whole month. Timestamps use West Africa Time (UTC+1).
      </p>
    </div>
  )
}
