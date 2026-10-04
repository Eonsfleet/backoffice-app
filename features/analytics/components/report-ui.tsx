'use client'

import { AlertOctagon, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatNumber, percent, type Severity } from '@/features/analytics/report'

export const SEVERITY_STYLES: Record<Severity, { icon: LucideIcon; label: string; text: string; surface: string; bar: string }> = {
  critical: { icon: AlertOctagon, label: 'Critical', text: 'text-status-error', surface: 'bg-status-error-surface', bar: 'bg-red-500' },
  warning: { icon: AlertTriangle, label: 'Warning', text: 'text-status-warning', surface: 'bg-status-warning-surface', bar: 'bg-amber-500' },
  info: { icon: Info, label: 'Info', text: 'text-status-info', surface: 'bg-status-info-surface', bar: 'bg-blue-500' },
  healthy: { icon: CheckCircle2, label: 'Healthy', text: 'text-status-success', surface: 'bg-status-success-surface', bar: 'bg-emerald-500' },
}

export const CHART_GRID = 'var(--border)'
export const CHART_AXIS = { fontSize: 11, fill: 'var(--muted-foreground)' }

export function ReportSection({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardHeader className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn('p-5', contentClassName)}>{children}</CardContent>
    </Card>
  )
}

export function StatBlock({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div className={cn('min-w-0 rounded-lg border bg-muted/20 px-4 py-3', className)}>
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5" />}
        {label}
      </dt>
      <dd className="mt-1.5 truncate text-xl font-semibold tabular-nums tracking-tight">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>}
    </div>
  )
}

export function Meter({ value, className, label }: { value: number | null; className?: string; label?: string }) {
  const width = Math.max(0, Math.min(value ?? 0, 100))
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', className ?? 'bg-primary')} style={{ width: `${width}%` }} />
    </div>
  )
}

export function MeterRow({ label, value, detail, className }: { label: string; value: number | null; detail?: string; className?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value == null ? 'n/a' : `${value}%`}</span>
      </div>
      <Meter value={value} className={className} label={label} />
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

interface TooltipEntry { name?: string | number; value?: number | string; color?: string; payload?: Record<string, unknown> }

export function ChartTooltip({
  active,
  payload,
  label,
  labelKey,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  labelKey?: string
}) {
  if (!active || !payload?.length) return null
  const heading = labelKey ? String(payload[0]?.payload?.[labelKey] ?? label ?? '') : String(label ?? '')
  return (
    <div className="min-w-36 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {heading && <p className="mb-1.5 font-medium">{heading}</p>}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums">{typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface BreakdownRow {
  key: string
  label: string
  sublabel?: string
  count: number
  color: string
}

/** Classic tabular breakdown: label, count, share and an inline bar, with a total footer. */
export function BreakdownTable({ rows, unit, caption }: { rows: BreakdownRow[]; unit: string; caption: string }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
          <th scope="col" className="pb-2 font-medium">Category</th>
          <th scope="col" className="pb-2 text-right font-medium">{unit}</th>
          <th scope="col" className="hidden w-[40%] pb-2 pl-4 font-medium sm:table-cell">Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const share = percent(row.count, total) ?? 0
          return (
            <tr key={row.key} className="border-b border-dashed last:border-0">
              <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: row.color }} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{row.label}</span>
                    {row.sublabel && <span className="block text-xs text-muted-foreground">{row.sublabel}</span>}
                  </span>
                </span>
              </th>
              <td className="py-2.5 text-right tabular-nums">{formatNumber(row.count)}</td>
              <td className="hidden py-2.5 pl-4 sm:table-cell">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: row.color }} />
                  </div>
                  <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{share}%</span>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="border-t text-sm font-semibold">
          <th scope="row" className="pt-2.5 text-left">Total</th>
          <td className="pt-2.5 text-right tabular-nums">{formatNumber(total)}</td>
          <td className="hidden sm:table-cell" />
        </tr>
      </tfoot>
    </table>
  )
}

export function SectionSkeleton({ rows = 3, chart = false }: { rows?: number; chart?: boolean }) {
  return (
    <div className="space-y-3">
      {chart && <Skeleton className="h-56 w-full" />}
      {Array.from({ length: rows }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}
    </div>
  )
}

export function InlineEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
