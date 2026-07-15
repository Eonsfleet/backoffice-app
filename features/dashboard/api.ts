import { api } from '@/lib/api/client'
import type { DashboardMetrics, Organization } from '@/types/api'

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const { data } = await api.get('/admin/dashboard-metrics')
  const d = data.data ?? {}
  // API returns nested { total_organization: { count: N }, ... }
  return {
    total_organizations:  d.total_organization?.count  ?? d.total_organizations  ?? 0,
    total_vehicles:       d.total_vehicle?.count        ?? d.total_vehicles       ?? 0,
    total_users:          d.total_user?.count            ?? d.total_users          ?? 0,
    total_devices:        d.total_device?.count          ?? d.total_devices        ?? 0,
    active_subscriptions: d.active_subscriptions ?? 0,
    revenue_this_month:   d.revenue_this_month   ?? 0,
    online_devices:       d.online_devices       ?? 0,
    organizations_growth: d.organizations_growth ?? undefined,
  }
}

export type OrgPerformanceEntry = {
  name: string
  value: number
}

export type SubscriptionMetrics = {
  total_subscriptions:   number
  active_subscriptions:  number
  expired_subscriptions: number
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
  online: number
  offline: number
  unassigned: number
}

export const getDashboardDevices = async (): Promise<DeviceStatusBreakdown> => {
  const { data } = await api.get('/admin/dashboard-device-metrics')
  const d = data.data ?? data
  const pick = (v: unknown): number => {
    if (typeof v === 'number') return v
    if (v && typeof v === 'object' && 'count' in v) return (v as { count: number }).count ?? 0
    if (v && typeof v === 'object' && 'total' in v) return (v as { total: number }).total ?? 0
    return 0
  }
  return {
    online:     pick(d.online),
    offline:    pick(d.offline),
    unassigned: pick(d.unassigned) || pick(d.disconnected),
  }
}

export const getSubscriptionMetrics = async (): Promise<SubscriptionMetrics> => {
  const { data } = await api.get('/admin/dashboard-subscription-metrics')
  return data.data
}

export const getOrgPerformance = async (): Promise<OrgPerformanceEntry[]> => {
  const { data } = await api.get('/admin/dashboard-org-performace')
  return data.data ?? []
}
