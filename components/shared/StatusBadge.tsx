import { cn } from '@/lib/utils'
import type { OrgStatus, SubStatus, DeviceStatus, UserStatus, VehicleStatus } from '@/types/api'

type Status = OrgStatus | SubStatus | DeviceStatus | UserStatus | VehicleStatus | string

const STATUS_STYLES: Record<string, string> = {
  // Org / Subscription
  active:              'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  grace:               'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  restricted:          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  suspended:           'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  trial:               'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  expired:             'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  cancelled:           'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  // User
  pending_activation:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  invite_sent:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  email_verified:      'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  blocked:             'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  exit:                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  // Vehicle
  in_transit:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_use:              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  available:           'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  stopped:             'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  maintenance:         'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  under_maintenance:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  needs_inspection:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  out_of_service:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  decommissioned:      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  gps_disconnected:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  // Device
  online:              'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  offline:             'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  unassigned:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  unresponsive:        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  pending_setup:       'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  configured:          'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  faulty:              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  replaced:            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  deactivated:         'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  // Billing / payments
  successful:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  failed:              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  paid:                'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  unpaid:              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue:             'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  // Generic
  inactive:            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pending:             'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed:           'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
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
