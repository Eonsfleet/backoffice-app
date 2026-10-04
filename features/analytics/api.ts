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
  imei:          string
  organization?: string | null
  last_seen?:    string | null
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

export const getDeviceHealthMetrics = async (params?: { stale_days?: number }): Promise<DeviceHealth> => {
  const { data } = await api.get('/admins/analytics/device-health', { params })
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

export interface GrowthSeriesPoint {
  period: string
  count:  number
}

export interface GrowthChange {
  value:   number
  percent: number
}

export type GrowthPeriod = '7d' | '30d' | '90d' | '1y'

export interface GrowthAnalytics {
  period:   string
  group_by: 'DAY' | 'WEEK' | 'MONTH'
  current: {
    organizations: number
    subscriptions: number
    users:         number
    devices:       number
  }
  previous: {
    organizations: number
    subscriptions: number
    users:         number
    devices:       number
  }
  change: {
    organizations: GrowthChange
    subscriptions: GrowthChange
    users:         GrowthChange
    devices:       GrowthChange
  }
  series: {
    organizations: GrowthSeriesPoint[]
    subscriptions: GrowthSeriesPoint[]
    users:         GrowthSeriesPoint[]
    devices:       GrowthSeriesPoint[]
  }
}

export const getGrowthMetrics = async (params?: { period?: GrowthPeriod }): Promise<GrowthAnalytics> => {
  const { data } = await api.get('/admins/analytics/growth', { params })
  return data.data as GrowthAnalytics
}

export const getPerformanceMetrics = async () => {
  const { data } = await api.get('/performance/metrics')
  return data.data
}
