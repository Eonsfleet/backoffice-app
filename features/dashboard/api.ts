import { api } from '@/lib/api/client'
import type { DashboardMetrics, Organization } from '@/types/api'

function count(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : undefined
  if (value && typeof value === 'object') { const node = value as { count?: unknown; total?: unknown }; return count(node.count ?? node.total) }
  return undefined
}

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const { data } = await api.get('/admin/dashboard-metrics')
  const d = data.data ?? {}
  // API returns nested { total_organization: { count: N }, ... }
  return {
    total_organizations: count(d.total_organization ?? d.total_organizations),
    total_vehicles: count(d.total_vehicle ?? d.total_vehicles),
    total_users: count(d.total_user ?? d.total_users),
    total_devices: count(d.total_device ?? d.total_devices),
    active_subscriptions: count(d.active_subscriptions),
    revenue_this_month: count(d.revenue_this_month),
    online_devices: count(d.online_devices),
    organizations_growth: typeof d.organizations_growth === 'number' && Number.isFinite(d.organizations_growth) ? d.organizations_growth : undefined,
  }
}

export type OrgPerformanceEntry = {
  name: string
  value: number
}

export type SubscriptionMetrics = {
  total_subscriptions?: number
  active_subscriptions?: number
  expired_subscriptions?: number
}

export const getDashboardOrganizations = async (): Promise<Organization[]> => {
  const { data } = await api.get('/admin/dashboard-organizations')
  const raw: Array<{
    id: string
    attributes: Record<string, unknown>
    relationships: Record<string, unknown>
  }> = data.data ?? []
  // Flatten JSON:API { id, attributes, relationships } into a single object
  return raw.map((o) => ({
    id: o.id,
    ...(o.attributes as Omit<Organization, 'id'>),
    ...(o.relationships as Record<string, unknown>),
  }))
}

export type DeviceStatusBreakdown = {
  online?: number
  offline?: number
  unassigned?: number
}

export const getDashboardDevices = async (): Promise<DeviceStatusBreakdown> => {
  const { data } = await api.get('/admin/dashboard-device-metrics')
  const d = data.data ?? data

  return {
    online:     count(d.online),
    offline:    count(d.offline),
    // disconnected counts vehicles without a device, not unassigned hardware.
    unassigned: count(d.unassigned),
  }
}

export const getSubscriptionMetrics = async (): Promise<SubscriptionMetrics> => {
  const { data } = await api.get('/admin/dashboard-subscription-metrics')
  const d = data.data ?? {}
  return { total_subscriptions: count(d.total_subscriptions), active_subscriptions: count(d.active_subscriptions), expired_subscriptions: count(d.expired_subscriptions) }
}

export const getOrgPerformance = async (): Promise<OrgPerformanceEntry[]> => {
  const { data } = await api.get('/admin/dashboard-org-performace')
  return data.data ?? []
}
