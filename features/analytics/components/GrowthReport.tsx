'use client'

import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { GrowthAnalytics, GrowthPeriod } from '@/features/analytics/api'
import { formatNumber, GROWTH_PERIODS, GROWTH_SERIES, mergeGrowthSeries, type GrowthKey } from '@/features/analytics/report'
import { CHART_AXIS, CHART_GRID, ChartTooltip, InlineEmpty, ReportSection, SectionSkeleton } from './report-ui'

const GROUP_LABEL = { DAY: 'day', WEEK: 'week', MONTH: 'month' } as const

export function ChangeIndicator({ value, percent, className }: { value: number; percent: number; className?: string }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums',
      value > 0 && 'bg-status-success-surface text-status-success',
      value < 0 && 'bg-status-error-surface text-status-error',
      value === 0 && 'bg-muted text-muted-foreground',
      className,
    )}>
      <Icon aria-hidden="true" className="h-3 w-3" />
      {value > 0 ? '+' : ''}{percent}%
    </span>
  )
}

export function PeriodSelect({ value, onChange }: { value: GrowthPeriod; onChange: (value: GrowthPeriod) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as GrowthPeriod)}>
      <SelectTrigger className="h-9 w-full sm:w-40" aria-label="Reporting period"><SelectValue /></SelectTrigger>
      <SelectContent>
        {GROWTH_PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

export function GrowthReport({
  growth,
  isLoading,
  period,
  onPeriodChange,
}: {
  growth?: GrowthAnalytics
  isLoading: boolean
  period: GrowthPeriod
  onPeriodChange: (value: GrowthPeriod) => void
}) {
  const [hidden, setHidden] = useState<Set<GrowthKey>>(new Set())
  const series = useMemo(() => mergeGrowthSeries(growth), [growth])
  const periodLabel = GROWTH_PERIODS.find((p) => p.value === period)?.label.toLowerCase() ?? 'this period'

  const toggle = (key: GrowthKey) => setHidden((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else if (next.size < GROWTH_SERIES.length - 1) next.add(key)
    return next
  })

  return (
    <div className="space-y-4">
      <ReportSection
        title="New platform activity"
        description={`New records created per ${growth ? GROUP_LABEL[growth.group_by] : 'period'}, ${periodLabel}.`}
        action={<PeriodSelect value={period} onChange={onPeriodChange} />}
      >
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Toggle series">
          {GROWTH_SERIES.map(({ key, label, color }) => {
            const active = !hidden.has(key)
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(key)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  active ? 'bg-card text-foreground' : 'bg-muted/40 text-muted-foreground line-through',
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? color : 'var(--muted-foreground)' }} />
                {label}
                {growth && <span className="tabular-nums text-muted-foreground">{formatNumber(growth.current[key])}</span>}
              </button>
            )
          })}
        </div>
        {isLoading ? <SectionSkeleton chart rows={0} /> : series.length ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  {GROWTH_SERIES.map(({ key, color }) => (
                    <linearGradient key={key} id={`growth-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                <XAxis dataKey="label" tick={CHART_AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tick={CHART_AXIS} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                {GROWTH_SERIES.filter(({ key }) => !hidden.has(key)).map(({ key, label, color }) => (
                  <Area key={key} type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2} fill={`url(#growth-${key})`} activeDot={{ r: 4 }} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <InlineEmpty>No activity recorded for this period.</InlineEmpty>}
      </ReportSection>

      <ReportSection title="Period comparison" description="New records this period against the period of equal length immediately before it." contentClassName="p-0">
        {isLoading || !growth ? <div className="p-5"><SectionSkeleton rows={4} /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Growth compared with the previous period</caption>
              <thead className="bg-muted/40">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 font-medium">Metric</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">This period</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Previous period</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Net change</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {GROWTH_SERIES.map(({ key, label, color }) => (
                  <tr key={key} className="border-t">
                    <th scope="row" className="px-5 py-3 text-left font-medium">
                      <span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />New {label.toLowerCase()}</span>
                    </th>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatNumber(growth.current[key])}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{formatNumber(growth.previous[key])}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{growth.change[key].value > 0 ? '+' : ''}{formatNumber(growth.change[key].value)}</td>
                    <td className="px-5 py-3 text-right"><ChangeIndicator {...growth.change[key]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">When the previous period had no records, any new activity is shown as +100%.</p>
          </div>
        )}
      </ReportSection>
    </div>
  )
}
