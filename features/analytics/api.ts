import { api } from '@/lib/api/client'

// ─── Device Health ────────────────────────────────────────────────────────────

export interface DeviceHealthSummary {
  total:      number
  online:     number
  offline:    number
  unassigned: number
}

export interface LastSeenBucket {
  bucket: string
  count:  number
}

export interface SignalDistributionItem {
  quality: string
  range:   string
  count:   number
}

export interface StaleDeviceItem {
  id:          string | number
  device_id?:  string
  last_seen?:  string | null
  [key: string]: unknown
}

export interface DeviceHealth {
  summary:              DeviceHealthSummary
  last_seen_buckets:    LastSeenBucket[]
  signal_distribution:  SignalDistributionItem[]
  stale_devices: {
    threshold_days: number
    count:          number
    devices:        StaleDeviceItem[]
  }
}

export const getDeviceHealthMetrics = async (): Promise<DeviceHealth> => {
  const { data } = await api.get('/admins/analytics/device-health')
  return data.data as DeviceHealth
}

// ─── Fleet Health ─────────────────────────────────────────────────────────────

export interface FleetHealth {
  summary: {
    total:          number
    with_device:    number
    no_device:      number
    device_online:  number
    device_offline: number
  }
  movement: {
    moving_now:     number
    active_today:   number
    inactive_today: number
  }
  trips: {
    total_today:                  number
    completed_this_month:         number
    in_progress:                  number
    total_distance_km_this_month: number
  }
  status_distribution: { status: string; count: number }[]
}

export const getFleetHealthMetrics = async (): Promise<FleetHealth> => {
  const { data } = await api.get('/admins/analytics/fleet-health')
  return data.data as FleetHealth
}

// ─── Growth ───────────────────────────────────────────────────────────────────

export const getGrowthMetrics = async (params?: { months?: number }) => {
  const { data } = await api.get('/admins/analytics/growth', { params })
  return data.data ?? data.message
}

export const getPerformanceMetrics = async () => {
  const { data } = await api.get('/performance/metrics')
  return data.data
}
