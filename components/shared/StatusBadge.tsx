import { cn } from '@/lib/utils'

// All status slugs returned by the backend Status model or stored as raw strings.
// This component accepts any string — unknown slugs fall back to neutral gray.
// Grouped by domain for readability; colors follow a semantic palette:
//   green (emerald) = positive / working / verified
//   blue            = informational / in-progress / neutral action
//   yellow (amber)  = waiting / attention / caution
//   orange          = warning / degraded / needs action
//   red             = error / blocked / negative / critical
//   gray            = neutral / ended / disabled / archived
//   purple          = special / distinct state

const STATUS_STYLES: Record<string, string> = {
  // ── Active / Positive ────────────────────────────────────────────────────────
  active:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  online:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  available:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  in_use:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  verified:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  email_verified:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  approved:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  completed:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  resolved:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  successful:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  paid:            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  started:         'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',

  // ── Informational / In-Progress ──────────────────────────────────────────────
  trial:           'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_transit:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ongoing:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  invite_sent:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  unassigned:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  configured:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  submitted:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  queued:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',

  // ── Caution / Waiting ────────────────────────────────────────────────────────
  grace:              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending:            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending_activation: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending_approval:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending_review:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending_setup:      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending_assignment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending_verification: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  on_hold:            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  unpaid:             'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  paused:             'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  scheduled:          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  upcoming:           'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',

  // ── Warning / Degraded ───────────────────────────────────────────────────────
  restricted:         'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  maintenance:        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  under_maintenance:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  needs_inspection:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  gps_disconnected:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  unresponsive:       'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  overdue:            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  delayed:            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  escalated:          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  flagged_for_review: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  rescheduled:        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  awaiting_parts:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',

  // ── Critical / Blocked / Error ───────────────────────────────────────────────
  suspended:          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  blocked:            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  failed:             'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  rejected:           'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  out_of_service:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  faulty:             'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  blacklisted:        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  under_investigation:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  exit:               'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  missed:             'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  breached:           'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',

  // ── Neutral / Ended / Disabled ───────────────────────────────────────────────
  inactive:       'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  offline:        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  expired:        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  stopped:        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  decommissioned: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  deactivated:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  replaced:       'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  cancelled:      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  closed:         'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  deleted:        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  draft:          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  dismissed:      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  archived:       'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  archieved:      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

// Human-readable overrides for slugs where replace(/_/g, ' ') isn't ideal
const STATUS_LABELS: Record<string, string> = {
  in_use:             'In Use',
  in_transit:         'In Transit',
  in_progress:        'In Progress',
  pending_activation: 'Pending Activation',
  pending_approval:   'Pending Approval',
  pending_review:     'Pending Review',
  pending_setup:      'Pending Setup',
  pending_assignment: 'Pending Assignment',
  pending_verification: 'Pending Verification',
  email_verified:     'Email Verified',
  invite_sent:        'Invite Sent',
  gps_disconnected:   'GPS Disconnected',
  out_of_service:     'Out of Service',
  under_maintenance:  'Under Maintenance',
  needs_inspection:   'Needs Inspection',
  on_hold:            'On Hold',
  under_investigation:'Under Investigation',
  awaiting_parts:     'Awaiting Parts',
  flagged_for_review: 'Flagged for Review',
  pending_verification_label: 'Pending Verification',
}

interface StatusBadgeProps {
  status: string | null | undefined
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null

  const styles = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        styles,
        className
      )}
    >
      {label}
    </span>
  )
}
