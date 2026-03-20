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

export const getFleetHealthMetrics = async () => {
  const { data } = await api.get('/admins/analytics/fleet-health')
  return data.data ?? data.message
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
