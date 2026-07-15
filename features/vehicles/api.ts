import { api } from '@/lib/api/client'
import type { Vehicle, VehicleLocation, PaginatedResponse } from '@/types/api'

export interface VehicleFilters {
  page?: number
  per_page?: number
  q?: string
  status?: string
  organization_id?: string | number
  has_device?: boolean
}

export interface VehiclePayload {
  registration_number: string
  make?: string
  model?: string
  year?: number
  color?: string
  vin?: string
  fuel_type?: string
  fuel_capacity?: number
  fuel_capacity_unit?: string
  body_type?: string
  status?: string
  organization_id: string | number
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

type RawDriver =
  | { id: number | string; name: string; avatar?: string | null; assigned_date?: string }
  | unknown[]

type RawLocation = {
  id: string
  attributes: {
    coordinates?: { latitude: number; longitude: number }
    speed?: number | null
    heading?: number | null
    altitude?: number | null
    accuracy?: number | null
    timestamp?: string | null
  }
} | null | unknown[]

type RawVehicle = {
  id: string
  attributes: Record<string, unknown>
  relationships: {
    organization?: {
      id: string
      attributes: { name: string; [key: string]: unknown }
    }
    current_driver?: RawDriver
    current_location?: RawLocation
  }
}

function normalizeLocation(raw: RawLocation): VehicleLocation | null {
  if (!raw || Array.isArray(raw)) return null
  const loc = raw as { id: string; attributes: Record<string, unknown> }
  const attrs = loc.attributes ?? (raw as Record<string, unknown>)
  const coords = attrs.coordinates as { latitude: number; longitude: number } | undefined
  const latitude = coords?.latitude ?? attrs.latitude
  const longitude = coords?.longitude ?? attrs.longitude
  if (latitude == null || longitude == null) return null
  return {
    latitude:  Number(latitude),
    longitude: Number(longitude),
    speed:     (attrs.speed as number) ?? null,
    heading:   ((attrs.heading ?? attrs.angle) as number) ?? null,
    altitude:  (attrs.altitude as number) ?? null,
    accuracy:  (attrs.accuracy as number) ?? null,
    timestamp: ((attrs.timestamp ?? attrs.last_packet_received_at ?? attrs.created_at) as string) ?? null,
  }
}

function normalizeDriver(raw: RawDriver): Vehicle['driver'] {
  if (!raw || Array.isArray(raw)) return null
  const d = raw as { id: number | string; name: string; avatar?: string | null; assigned_date?: string }
  return {
    id:            d.id,
    name:          d.name,
    avatar:        d.avatar ?? null,
    assigned_date: d.assigned_date,
  }
}

function normalizeVehicle(raw: RawVehicle): Vehicle {
  const a = raw.attributes
  const rel = raw.relationships ?? {}

  const org = rel.organization
    ? {
        id:         rel.organization.id,
        name:       rel.organization.attributes.name as string,
        identifier: (rel.organization.attributes.identifier as string | number | undefined)?.toString(),
      }
    : null

  return {
    id:                  raw.id,
    plate_number:        (a.registration_number as string) ?? '',
    display_number:      (a.display_number as string) ?? null,
    make:                (a.make as string) ?? null,
    model:               (a.model as string) ?? null,
    year:                a.year ? Number(a.year) : null,
    color:               (a.color as string) ?? null,
    body_type:           (a.body_type as string) ?? null,
    fuel_type:           (a.fuel_type as string) ?? null,
    fuel_capacity:       (a.fuel_capacity as number) ?? null,
    fuel_capacity_unit:  (a.fuel_capacity_unit as string) ?? null,
    chasis_number:       (a.chasis_number as string) ?? null,
    image:               (a.image as string) ?? null,
    device_id:           (a.device_id as string) ?? null,
    device_connected:    (a.device_connected as boolean) ?? false,
    device_status:       ((a.device_status ?? a.deviceStatus) as string) ?? null,
    total_odometer:      (a.total_odometer as number) ?? null,
    last_odometer_value: (a.last_odometer_value as string) ?? null,
    status:              (a.status as string) ?? 'active',
    created_at:          (a.created_at as string) ?? undefined,
    organization:        org,
    driver:              normalizeDriver(rel.current_driver as RawDriver),
    current_location:    normalizeLocation(rel.current_location as RawLocation),
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const listVehicles = async (
  params?: VehicleFilters
): Promise<PaginatedResponse<Vehicle>> => {
  const { data: res } = await api.get('/admin/vehicles', { params })
  const inner = res.data
  const raw: RawVehicle[] = inner?.vehicles ?? inner?.data ?? []
  const pg = inner?.pagination

  return {
    data: raw.map(normalizeVehicle),
    meta: {
      current_page: pg?.current   ?? 1,
      last_page:    pg?.lastPage  ?? 1,
      per_page:     pg?.perPage   ?? raw.length,
      total:        pg?.total     ?? raw.length,
    },
  }
}

export const getVehicle = async (id: string | number): Promise<Vehicle> => {
  const { data: res } = await api.get(`/admin/vehicles/${id}`)
  const raw = res.data?.vehicle ?? res.data
  // Single vehicle may be wrapped differently
  return normalizeVehicle(raw?.id ? raw : { id: String(id), attributes: raw, relationships: {} })
}

export const createVehicle = async (payload: VehiclePayload): Promise<Vehicle> => {
  const { data: res } = await api.post('/admin/vehicles', payload)
  return normalizeVehicle(res.data?.vehicle ?? res.data)
}

export const updateVehicle = async (
  id: string | number,
  payload: Partial<VehiclePayload>
): Promise<Vehicle> => {
  const { data: res } = await api.patch(`/admin/vehicles/${id}`, payload)
  return normalizeVehicle(res.data?.vehicle ?? res.data)
}

export const deleteVehicle = async (id: string | number): Promise<void> => {
  await api.delete(`/admin/vehicles/${id}`)
}

export const assignDeviceToVehicle = async (
  vehicleId: string | number,
  deviceImei: string
): Promise<Vehicle> => {
  const { data: res } = await api.put(`/admin/vehicles/${vehicleId}/assign-device`, { device_id: deviceImei })
  return normalizeVehicle(res.data?.vehicle ?? res.data)
}

export const unassignDeviceFromVehicle = async (vehicleId: string | number): Promise<void> => {
  await api.post(`/admin/vehicles/${vehicleId}/unassign-device`)
}

export interface VehicleMetrics {
  total: number
  with_device: number
  without_device: number
  active: number
  inactive: number
  maintenance: number
}

type MetricValue = number | { count?: number; periodic?: number } | null | undefined

function extractCount(v: MetricValue): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  return v.count ?? 0
}

export const getVehicleMetrics = async (): Promise<VehicleMetrics> => {
  const { data: res } = await api.get('/admin/vehicles/stats')
  const d = res.data ?? res
  return {
    total:          extractCount(d.total),
    with_device:    extractCount(d.with_device),
    without_device: extractCount(d.without_device),
    active:         extractCount(d.active),
    inactive:       extractCount(d.inactive),
    maintenance:    extractCount(d.maintenance ?? d.under_maintenance),
  }
}

// ─── Import / Export ──────────────────────────────────────────────────────────

function downloadBlob(data: BlobPart, filename: string, type: string) {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const downloadVehicleImportTemplate = async (): Promise<void> => {
  const response = await api.get('/admin/vehicles/export/template', { responseType: 'blob' })
  downloadBlob(
    response.data,
    'vehicles_import_template.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
}

export const exportVehicles = async (filters?: VehicleFilters): Promise<void> => {
  const response = await api.get('/admin/vehicles/export', {
    params: { ...filters, format: 'csv' },
    responseType: 'blob',
  })
  downloadBlob(response.data, `vehicles-${Date.now()}.csv`, 'text/csv')
}

export const importVehicles = async (
  file: File,
  organizationId: string | number
): Promise<{ batch_id: string }> => {
  const form = new FormData()
  form.append('file', file)
  form.append('model', 'Vehicle')
  form.append('organization_id', String(organizationId))
  const { data } = await api.post('/admin/file/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}
