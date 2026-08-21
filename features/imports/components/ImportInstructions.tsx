'use client'

import { Download, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  IMPORT_SCHEMA,
  optionalColumns,
  requiredColumns,
  type ImportColumn,
  type ImportModule,
} from '@/features/imports/schema'

function ColumnChip({ column }: { column: ImportColumn }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span
        className={[
          'rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]',
          column.required ? 'text-foreground' : 'text-muted-foreground',
        ].join(' ')}
      >
        {column.name}
      </span>
      {column.unique && <span className="text-[10px] text-muted-foreground">unique</span>}
      {column.note && <span className="text-[10px] text-muted-foreground">({column.note})</span>}
    </span>
  )
}

/**
 * The guidance shown beside an import upload box: which columns are required,
 * which are optional, and that the sheet is checked as a whole before anything
 * is written.
 *
 * Shared by the vehicle, device and user forms so the three cannot drift apart
 * from each other or from the backend schema they describe.
 */
export function ImportInstructions({
  module,
  onDownloadTemplate,
  downloading = false,
  templateLabel = 'Download Template',
}: {
  module: ImportModule
  onDownloadTemplate?: () => void
  downloading?: boolean
  templateLabel?: string
}) {
  const spec = IMPORT_SCHEMA[module]
  const required = requiredColumns(module)
  const optional = optionalColumns(module)

  return (
    <div className="space-y-3 rounded-lg border border-dashed bg-muted/30 p-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Sheet columns</p>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5 text-xs">
          <span className="text-muted-foreground">Required:</span>
          {required.map((c) => (
            <ColumnChip key={c.name} column={c} />
          ))}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5 text-xs">
          <span className="text-muted-foreground">Optional:</span>
          {optional.map((c) => (
            <ColumnChip key={c.name} column={c} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 rounded-md bg-background/60 p-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Every row is checked before anything is saved. If any row is invalid,
          <span className="font-medium text-foreground"> nothing is imported</span> and
          you&apos;ll get the row numbers and reasons to fix. Column order does not matter.
        </p>
      </div>

      {onDownloadTemplate && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDownloadTemplate}
          disabled={downloading}
        >
          <Download className="mr-2 h-3.5 w-3.5" />
          {downloading ? 'Downloading…' : templateLabel}
        </Button>
      )}

      <p className="sr-only">
        Importing {spec.label}. Required columns: {required.map((c) => c.name).join(', ')}.
      </p>
    </div>
  )
}
