import { api } from '@/lib/api/client'
import type { OnboardingSource, Organization, PaginatedResponse } from '@/types/api'
import { normalizePaginated } from '@/lib/api/utils'

/**
 * OrganizationResource nests the address as its own JSON:API-style node:
 *   relationships.address = { id, attributes: { street, city, state, country, zipcode } }
 *
 * Flatten it into top-level fields (and a display string) so components can
 * render `org.address` as text and the edit form can prefill each part.
 * The key is absent entirely when the organization has no address row.
 */
interface AddressNode {
  id?: string
  attributes?: {
    street?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
    zipcode?: string | null
  }
}

const flattenAddress = (org: Record<string, unknown>): Organization => {
  const node = org.address as AddressNode | string | null | undefined

  // Already a plain string (or missing) — nothing to unwrap.
  if (node == null || typeof node === 'string') return org as unknown as Organization

  const a = node.attributes ?? {}
  const line = [a.street, a.city, a.state, a.country].filter(Boolean).join(', ')

  return {
    ...(org as unknown as Organization),
    street:  a.street  ?? undefined,
    city:    a.city    ?? undefined,
    state:   a.state   ?? undefined,
    country: a.country ?? undefined,
    zipcode: a.zipcode ?? undefined,
    address: line || undefined,
  }
}

/** Unwrap the `{ id, attributes, relationships }` envelope a single resource returns. */
const unwrapOrganization = (o: Record<string, unknown> | null | undefined): Organization => {
  if (!o) return o as unknown as Organization
  const flat = o.attributes
    ? { id: o.id, ...(o.attributes as object), ...((o.relationships as object) ?? {}) }
    : o
  return flattenAddress(flat as Record<string, unknown>)
}

export interface OrgFilters {
  page?: number
  per_page?: number
  q?: string
  status?: string
  plan?: string
  from_date?: string
  to_date?: string
  onboarding_source?: OnboardingSource
}

export interface OrganizationPayload {
  name?: string
  email?: string
  phone_number?: string
  fleet_size?: number
  industry?: string
  street?: string
  city?: string
  state?: string
  country?: string
  zipcode?: string
  /** Edit only; the server generates it on create and ignores any sent. */
  slug?: string
  billing_type?: 'poc' | 'production'
  plan_id?: number
  billing_cycle?: 'monthly' | 'yearly'
  evaluation_days?: number
}

export const listOrganizations = async (
  params?: OrgFilters
): Promise<PaginatedResponse<Organization>> => {
  const { data } = await api.get('/admin/organizations', { params })
  const page = normalizePaginated<Organization>(data)
  return {
    ...page,
    data: page.data.map((o) => flattenAddress(o as unknown as Record<string, unknown>)),
  }
}

export const getOrganization = async (id: string | number): Promise<Organization> => {
  const { data } = await api.get(`/admin/organizations/${id}`)
  return unwrapOrganization(data.data)
}

export const createOrganization = async (
  payload: OrganizationPayload
): Promise<Organization> => {
  const { data } = await api.post('/admin/organizations', payload)
  return unwrapOrganization(data.data)
}

export const updateOrganization = async (
  id: string | number,
  payload: OrganizationPayload
): Promise<Organization> => {
  const { data } = await api.put(`/admin/organizations/${id}`, payload)
  return unwrapOrganization(data.data)
}

export const suspendOrganization = async (id: string | number): Promise<void> => {
  await api.post(`/admin/organizations/${id}/suspend`)
}

export const unsuspendOrganization = async (id: string | number): Promise<void> => {
  await api.post(`/admin/organizations/${id}/unsuspend`)
}

export const setOrganizationStatus = async (
  id: string | number,
  status: 'active' | 'inactive' | 'suspended',
): Promise<Organization> => {
  const { data } = await api.patch(`/admin/organizations/${id}/status`, { status })
  return unwrapOrganization(data.data)
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
  const { data } = await api.get(`/admin/organizations/${identifier}/activity-log`, { params })

  const raw: OrgActivityEntry[] = Array.isArray(data.data) ? data.data : []

  const meta: OrgActivityMeta = {
    total:        data.meta?.total        ?? raw.length,
    per_page:     data.meta?.per_page     ?? raw.length,
    current_page: data.meta?.current_page ?? 1,
    last_page:    data.meta?.last_page    ?? 1,
  }

  return { data: raw, meta }
}
