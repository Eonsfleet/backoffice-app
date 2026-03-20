'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface JsonDiffViewerProps {
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  className?: string
}

type LineType = 'unchanged' | 'added' | 'removed'

interface DiffLine {
  key: string
  oldVal: string | undefined
  newVal: string | undefined
  type: LineType
}

function formatVal(v: unknown): string {
  if (v === undefined || v === null) return 'null'
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}

function buildDiff(
  oldObj: Record<string, unknown> | null,
  newObj: Record<string, unknown> | null
): DiffLine[] {
  const allKeys = Array.from(
    new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj ?? {})])
  ).sort()

  return allKeys.map((key) => {
    const oldVal = oldObj?.[key]
    const newVal = newObj?.[key]
    const oldStr = oldObj && key in oldObj ? formatVal(oldVal) : undefined
    const newStr = newObj && key in newObj ? formatVal(newVal) : undefined

    let type: LineType = 'unchanged'
    if (oldStr === undefined) type = 'added'
    else if (newStr === undefined) type = 'removed'
    else if (oldStr !== newStr) type = 'removed' // will show both

    return { key, oldVal: oldStr, newVal: newStr, type }
  })
}

const LINE_STYLES: Record<LineType, string> = {
  unchanged: '',
  added: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  removed: 'bg-red-500/10 text-red-700 dark:text-red-400',
}

function DiffCell({ value, type }: { value: string | undefined; type: 'old' | 'new' | 'same' }) {
  if (value === undefined) {
    return <td className="px-3 py-1.5 text-xs text-muted-foreground/40 italic">—</td>
  }
  const bg =
    type === 'old'
      ? 'bg-red-500/10 text-red-700 dark:text-red-400'
      : type === 'new'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : ''
  return (
    <td className={cn('px-3 py-1.5 text-xs font-mono whitespace-pre-wrap break-all max-w-[240px]', bg)}>
      {value}
    </td>
  )
}

export function JsonDiffViewer({ oldValues, newValues, className }: JsonDiffViewerProps) {
  const lines = useMemo(() => buildDiff(oldValues, newValues), [oldValues, newValues])

  if (!oldValues && !newValues) return null

  // Flat display if only one side exists
  const onlyNew = !oldValues && !!newValues
  const onlyOld = !!oldValues && !newValues

  if (onlyNew || onlyOld) {
    const obj = (onlyNew ? newValues : oldValues)!
    return (
      <div className={cn('overflow-auto rounded-lg border border-border', className)}>
        <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
          {JSON.stringify(obj, null, 2)}
        </pre>
      </div>
    )
  }

  return (
    <div className={cn('overflow-auto rounded-lg border border-border text-sm', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-32">
              Field
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 w-1/2">
              Before
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 w-1/2">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map(({ key, oldVal, newVal }) => {
            const changed = oldVal !== newVal
            const rowBg = changed ? '' : 'opacity-60'
            const oldType = changed ? (oldVal === undefined ? 'same' : 'old') : 'same'
            const newType = changed ? (newVal === undefined ? 'same' : 'new') : 'same'
            return (
              <tr key={key} className={cn('border-b border-border last:border-0 hover:bg-muted/20', rowBg)}>
                <td className="px-3 py-1.5 text-xs font-mono font-medium text-foreground/80 align-top">
                  {key}
                </td>
                <DiffCell value={oldVal} type={oldType} />
                <DiffCell value={newVal} type={newType} />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
