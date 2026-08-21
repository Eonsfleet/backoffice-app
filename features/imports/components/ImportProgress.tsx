'use client'

import { AlertTriangle, CheckCircle2, Download, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useImportProgress } from '@/features/imports/useImportProgress'
import { IMPORT_SCHEMA, type ImportModule } from '@/features/imports/schema'
import type { DataImportRow, ImportStatus } from '@/features/imports/api'

const PHASE_LABEL: Record<ImportStatus, string> = {
  pending: 'Queued…',
  validating: 'Checking every row…',
  processing: 'Importing…',
  completed: 'Import complete',
  completed_with_errors: 'Imported with errors',
  failed: 'Import blocked',
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function downloadErrorReport(rows: DataImportRow[], label: string) {
  const header = 'Row,Reason'
  const body = rows.map((r) => `${r.row_number},${csvEscape(r.error_message ?? 'Unknown error')}`)
  const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${label}-import-errors.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Live progress for a running import, and the per-row reasons when it fails.
 *
 * Imports are all-or-nothing: if any row is invalid the whole sheet is rejected
 * during the pre-flight pass and nothing is written, so the failure state says so
 * explicitly rather than leaving the operator guessing what landed.
 */
export function ImportProgress({
  importId,
  module,
  onDone,
  onReset,
}: {
  importId: number
  module: ImportModule
  onDone?: () => void
  onReset?: () => void
}) {
  const label = IMPORT_SCHEMA[module].label
  const { data, failedRows, finished, rejectedWholesale, succeeded, isError } =
    useImportProgress(importId)

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Could not read the import status. It may still be running — check the import history.
      </p>
    )
  }

  const status = data?.status ?? 'pending'
  const percent = data?.progress_percent ?? 0
  const inFlight = !finished

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium">
            {inFlight && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {succeeded && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            {status === 'completed_with_errors' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
            {rejectedWholesale && <XCircle className="h-4 w-4 text-destructive" />}
            {PHASE_LABEL[status]}
          </span>
          {data && data.total_rows > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {data.successful_rows + data.failed_rows} / {data.total_rows} rows
            </span>
          )}
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Import progress"
        >
          <div
            className={[
              'h-full transition-all duration-300',
              rejectedWholesale ? 'bg-destructive' : succeeded ? 'bg-emerald-500' : 'bg-primary',
            ].join(' ')}
            // A rejected sheet never got to write anything, so a part-filled bar
            // would misrepresent it — show the bar full in its failure colour.
            style={{ width: `${rejectedWholesale ? 100 : percent}%` }}
          />
        </div>
      </div>

      {succeeded && data && (
        <p className="text-sm text-muted-foreground">
          {data.successful_rows}{' '}
          {data.successful_rows === 1 ? IMPORT_SCHEMA[module].singular : label} imported.
        </p>
      )}

      {rejectedWholesale && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
          <p className="text-sm font-medium text-destructive">
            Nothing was imported — fix the sheet and upload it again.
          </p>
          {data?.error_message && (
            <p className="text-xs text-muted-foreground">{data.error_message}</p>
          )}
        </div>
      )}

      {status === 'completed_with_errors' && data && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            {data.successful_rows} imported, {data.failed_rows} could not be saved.
          </p>
        </div>
      )}

      {failedRows.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {failedRows.length} problem {failedRows.length === 1 ? 'row' : 'rows'}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => downloadErrorReport(failedRows, label)}
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Download report
            </Button>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60">
                <tr>
                  <th className="w-16 px-3 py-2 text-left font-medium">Row</th>
                  <th className="px-3 py-2 text-left font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {failedRows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.row_number}</td>
                    <td className="px-3 py-2">{row.error_message ?? 'Unknown error'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {finished && (
        <div className="flex gap-2 pt-1">
          {succeeded ? (
            <Button type="button" className="flex-1" onClick={onDone}>
              Done
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" className="flex-1" onClick={onReset}>
                Upload another file
              </Button>
              <Button type="button" onClick={onDone}>
                Close
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
