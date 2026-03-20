import { api } from '@/lib/api/client'
import type { Organization, PaginatedResponse } from '@/types/api'
import { normalizePaginated } from '@/lib/api/utils'

export interface OrgFilters {
  page?: number
  per_page?: number
  q?: string
  status?: string
  plan?: string
  from_date?: string
  to_date?: string
}

export const listOrganizations = async (
  params?: OrgFilters
): Promise<PaginatedResponse<Organization>> => {
  const { data } = await api.get('/admin/organizations', { params })
  return normalizePaginated<Organization>(data)
}

export const getOrganization = async (id: string | number): Promise<Organization> => {
  const { data } = await api.get(`/organizations/${id}`)
  const o = data.data
  return o?.attributes ? { id: o.id, ...o.attributes } : o
}

export const createOrganization = async (
  payload: Partial<Organization>
): Promise<Organization> => {
  const { data } = await api.post('/admin/organizations', payload)
  const o = data.data
  return o?.attributes ? { id: o.id, ...o.attributes } : o
}

export const updateOrganization = async (
  id: string | number,
  payload: Partial<Organization>
): Promise<Organization> => {
  const { data } = await api.put(`/organizations/${id}`, payload)
  const o = data.data
  return o?.attributes ? { id: o.id, ...o.attributes } : o
}

export const suspendOrganization = async (id: string | number): Promise<void> => {
  await api.post(`/organizations/${id}/suspend`)
}

export const unsuspendOrganization = async (id: string | number): Promise<void> => {
  await api.post(`organizations/${id}/unsuspend`)
}

export const deleteOrganization = async (id: string | number): Promise<void> => {
  await api.delete(`/admin/organizations/${id}`)
}

// ─── Performance ──────────────────────────────────────────────────────────────

export interface OrgPerformanceStats {
  total_trips:       number
  total_distance_km: number
  active_vehicles:   number
  avg_uptime_pct:    number
  fleet_status: {
    active:      number
    idle:        number
    maintenance: number
  }
  trip_activity: Array<{ label: string; trips: number; distance_km: number }>
  top_vehicles:  Array<{ plate: string; make_model: string; trips: number; distance_km: number }>
}

export const getOrgPerformanceStats = async (
  identifier: string | number
): Promise<OrgPerformanceStats> => {
  const { data } = await api.get(`/admin/organizations/${identifier}/performance`)
  const d = data.data ?? data

  const kpis   = d.kpis   ?? {}
  const charts = d.charts ?? {}
  const rawVehicles: Array<{ plate_number: string; make_model: string; trip_count: number; distance_km: number }> =
    d.top_vehicles ?? []

  // trip_activity: grouped_bar { labels, datasets } → flat array
  const tripChart = charts.trip_activity ?? {}
  const labels: string[] = tripChart.labels ?? []
  const tripsDs  = tripChart.datasets?.find((ds: { label: string }) => ds.label === 'Trips')
  const distDs   = tripChart.datasets?.find((ds: { label: string }) => ds.label?.startsWith('Distance'))
  const tripActivity = labels.map((label: string, i: number) => ({
    label,
    trips:       (tripsDs?.data?.[i] as number) ?? 0,
    distance_km: (distDs?.data?.[i]  as number) ?? 0,
  }))

  // fleet_status: donut { labels, data } → named fields
  const fleetChart  = charts.fleet_status ?? {}
  const fleetLabels: string[] = fleetChart.labels ?? []
  const fleetData:   number[] = fleetChart.data   ?? []
  const fleet = (key: string) =>
    fleetData[fleetLabels.findIndex((l: string) => l.toLowerCase() === key)] ?? 0

  return {
    total_trips:       kpis.total_trips           ?? 0,
    total_distance_km: kpis.distance_km           ?? 0,
    active_vehicles:   kpis.active_vehicles       ?? 0,
    avg_uptime_pct:    kpis.avg_device_uptime_pct ?? 0,
    fleet_status: {
      active:      fleet('active'),
      idle:        fleet('idle'),
      maintenance: fleet('maintenance'),
    },
    trip_activity: tripActivity,
    top_vehicles: rawVehicles.map((v) => ({
      plate:       v.plate_number,
      make_model:  v.make_model,
      trips:       v.trip_count,
      distance_km: v.distance_km,
    })),
  }
}

// ─── Activity log ─────────────────────────────────────────────────────────────

export interface OrgActivityEntry {
  id:            string | number
  description:   string
  resource_type: string
  resource_id:   string | number
  action:        'created' | 'updated' | 'deleted' | string
  changed_by:    { id: string | number | null; name: string | null; email: string | null }
  changed_at:    string
  changes:       Record<string, { from: unknown; to: unknown }> | null
}

export interface OrgActivityMeta {
  total:        number
  per_page:     number
  current_page: number
  last_page:    number
}

export const getOrgActivityLog = async (
  identifier: string | number,
  params?: { page?: number; per_page?: number }
): Promise<{ data: OrgActivityEntry[]; meta: OrgActivityMeta }> => {
  const { data } = await api.get(`/organizations/${identifier}/activity-log`, { params })

  const raw: OrgActivityEntry[] = Array.isArray(data.data) ? data.data : []

  const meta: OrgActivityMeta = {
    total:        data.meta?.total        ?? raw.length,
    per_page:     data.meta?.per_page     ?? raw.length,
    current_page: data.meta?.current_page ?? 1,
    last_page:    data.meta?.last_page    ?? 1,
  }

  return { data: raw, meta }
}
