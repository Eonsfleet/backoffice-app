import { cn } from '@/lib/utils'

type Variant = 'success' | 'warning' | 'error' | 'info' | 'neutral'
const groups: Record<Variant, string[]> = {
  success: ['active', 'available', 'online', 'configured', 'current', 'successful', 'paid', 'healthy', 'up', 'normal', 'approved', 'completed', 'email_verified'],
  warning: ['grace', 'restricted', 'pending_activation', 'maintenance', 'under_maintenance', 'needs_inspection', 'gps_disconnected', 'unresponsive', 'pending_setup', 'unpaid', 'warning', 'degraded', 'pending'],
  error: ['suspended', 'blocked', 'out_of_service', 'offline', 'faulty', 'failed', 'overdue', 'critical', 'unhealthy', 'down', 'rejected'],
  info: ['trial', 'invite_sent', 'in_transit', 'in_use', 'unassigned', 'in_review'],
  neutral: ['unknown', 'inactive', 'expired', 'cancelled', 'exit', 'stopped', 'decommissioned', 'replaced', 'deactivated'],
}
const styles: Record<Variant, string> = {
  success: 'bg-status-success-surface text-status-success',
  warning: 'bg-status-warning-surface text-status-warning',
  error: 'bg-status-error-surface text-status-error',
  info: 'bg-status-info-surface text-status-info',
  neutral: 'bg-status-neutral-surface text-status-neutral',
}
export function StatusBadge({ status, variant, className }: { status?: string | null; variant?: Variant; className?: string }) {
  const value = status?.trim().toLowerCase() || 'unknown'
  const tone = variant ?? (Object.keys(groups) as Variant[]).find(key => groups[key].includes(value)) ?? 'neutral'
  return <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium capitalize', styles[tone], className)}><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />{value.replace(/_/g, ' ')}</span>
}
