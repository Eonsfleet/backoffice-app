import { cn } from '@/lib/utils'
import type { OrgStatus, SubStatus, DeviceStatus } from '@/types/api'

type Status = OrgStatus | SubStatus | DeviceStatus | string

const STATUS_STYLES: Record<string, string> = {
  // Org / Subscription
  active:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  grace:       'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  restricted:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  suspended:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  trial:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  expired:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  // Vehicle
  in_transit:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  // Device
  online:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  offline:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  unassigned:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  // Generic
  inactive:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pending:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  successful:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  failed:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  paid:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  unpaid:      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null
  const styles = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'
  const label = status.replace(/_/g, ' ')

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
