import { cn } from '@/lib/utils'
import type { SyncView } from '@/features/odometer/lib'

const TONE: Record<SyncView['tone'], string> = {
  calm: 'border-status-info/30 bg-status-info-surface text-status-info',
  info: 'border-status-warning/30 bg-status-warning-surface text-status-warning',
  pending: 'border-border bg-muted/40 text-foreground',
}

/** Calm, never an error: a saved reading waiting for the telemetry platform. */
export function SyncNotice({ view, compact = false }: { view: SyncView | null; compact?: boolean }) {
  if (!view) return null
  if (compact) {
    return <span data-testid="sync-badge" className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-medium', TONE[view.tone])}>{view.label}</span>
  }
  return (
    <div role="status" data-testid="sync-notice" className={cn('rounded-lg border p-3 text-sm', TONE[view.tone])}>
      <p className="font-medium">{view.label}</p>
      <p className="mt-0.5 text-xs">{view.message}</p>
    </div>
  )
}
