'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FleetHealth, GrowthAnalytics } from '@/features/analytics/api'
import { formatNumber, GROWTH_SERIES, type Finding } from '@/features/analytics/report'
import { TrackingPipeline } from './FleetReport'
import { ChangeIndicator } from './GrowthReport'
import { InlineEmpty, ReportSection, SectionSkeleton, SEVERITY_STYLES } from './report-ui'

function FindingItem({ finding }: { finding: Finding }) {
  const style = SEVERITY_STYLES[finding.severity]
  const Icon = style.icon
  return (
    <li className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', style.surface, style.text)}>
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium">{finding.title}</p>
          <span className={cn('rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider', style.surface, style.text)}>{style.label}</span>
        </div>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{finding.detail}</p>
      </div>
      {finding.href && (
        <Link href={finding.href} className="hidden shrink-0 items-center gap-1 self-center text-xs font-medium text-primary hover:underline sm:inline-flex">
          {finding.action ?? 'Open'} <ArrowRight aria-hidden="true" className="h-3 w-3" />
        </Link>
      )}
    </li>
  )
}

export function OverviewReport({
  findings,
  fleet,
  growth,
  isLoading,
  isGrowthLoading,
  periodLabel,
  onOpenGrowth,
}: {
  findings: Finding[]
  fleet?: FleetHealth
  growth?: GrowthAnalytics
  isLoading: boolean
  isGrowthLoading: boolean
  periodLabel: string
  onOpenGrowth: () => void
}) {
  const counts = findings.reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] ?? 0) + 1 }), {})

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <ReportSection
          title="Key findings"
          description="Generated from the latest fleet and device snapshot, most urgent first."
          action={!isLoading && (
            <div className="flex gap-1.5">
              {(['critical', 'warning', 'info'] as const).filter((s) => counts[s]).map((s) => (
                <span key={s} className={cn('rounded-md px-2 py-0.5 text-xs font-medium tabular-nums', SEVERITY_STYLES[s].surface, SEVERITY_STYLES[s].text)}>
                  {counts[s]} {SEVERITY_STYLES[s].label.toLowerCase()}
                </span>
              ))}
            </div>
          )}
        >
          {isLoading ? <SectionSkeleton rows={4} /> : findings.length ? (
            <ul className="divide-y">{findings.map((f) => <FindingItem key={f.id} finding={f} />)}</ul>
          ) : <InlineEmpty>Not enough data to generate findings yet.</InlineEmpty>}
        </ReportSection>

        <ReportSection
          title="Growth snapshot"
          description={`New records, ${periodLabel}.`}
          action={<button type="button" onClick={onOpenGrowth} className="text-xs font-medium text-primary hover:underline">Full growth report</button>}
        >
          {isGrowthLoading || !growth ? <SectionSkeleton rows={4} /> : (
            <ul className="divide-y">
              {GROWTH_SERIES.map(({ key, label, color }) => (
                <li key={key} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex items-center gap-2 text-sm">
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-base font-semibold tabular-nums">{formatNumber(growth.current[key])}</span>
                    <ChangeIndicator {...growth.change[key]} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ReportSection>
      </div>

      <ReportSection title="Tracking pipeline" description="From registered vehicles to vehicles moving right now.">
        <TrackingPipeline fleet={fleet} isLoading={isLoading} />
      </ReportSection>
    </div>
  )
}
