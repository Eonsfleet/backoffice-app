import { api } from '@/lib/api/client'
import type { Apn, Device, Hardware, PaginatedResponse } from '@/types/api'
import type { ImportStartedResponse } from '@/features/imports/api'

export interface DeviceFilters {
  page?: number
  per_page?: number
  q?: string
  status?: string
  organization_id?: string | number
  hardware_model?: string
}

type RawDevice = {
  id: string
  attributes: Record<string, unknown>
  relationships: {
    hardware?: Hardware | null
    vehicle?: { id: string | number; plate_number?: string; registration_number?: string } | null
    organization?: {
      id: string
      attributes: { name: string; [key: string]: unknown }
    } | null
  }
}

function normalizeDevice(raw: RawDevice): Device {
  const org = raw.relationships?.organization
  const vehicle = raw.relationships?.vehicle
  return {
    id:                      raw.id,
    ...(raw.attributes as Omit<Device, 'id' | 'hardware' | 'organization' | 'vehicle'>),
    hardware:                raw.relationships?.hardware ?? null,
    vehicle:                 vehicle ? {
      id:           vehicle.id,
      plate_number: vehicle.plate_number ?? vehicle.registration_number ?? '—',
    } : null,
    organization:            org ? {
      id:   String(org.attributes.identifier ?? org.id),
      name: org.attributes.name,
    } : null,
  }
}

export const listDevices = async (
  params?: DeviceFilters
): Promise<PaginatedResponse<Device>> => {
  const { data } = await api.get('/admin/devices', { params })
  const inner = data.data
  const raw: RawDevice[] = inner?.devices ?? inner?.data ?? []
  const pg = inner?.pagination
  return {
    data: raw.map(normalizeDevice),
    meta: {
      current_page: pg?.current   ?? 1,
      last_page:    pg?.lastPage  ?? 1,
      per_page:     pg?.perPage   ?? raw.length,
      total:        pg?.total     ?? raw.length,
    },
  }
}

export const getDevice = async (id: string | number): Promise<Device> => {
  const { data } = await api.get(`/admin/devices/${id}`)
  return normalizeDevice(data.data)
}

export interface DevicePayload {
  imei: string
  hardware_id?: string | number
  phone_number?: string
  country?: string
  organization_id?: string | number
}

export const importDevices = async (
  file: File,
  organizationId: string | number
): Promise<ImportStartedResponse> => {
  const form = new FormData()
  form.append('file', file)
  form.append('model', 'device')
  form.append('organization_id', String(organizationId))
  const { data } = await api.post('/admin/file/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

export const createDevice = async (payload: DevicePayload): Promise<Device> => {
  const { data } = await api.post('/admin/devices', payload)
  return normalizeDevice(data.data)
}

export const deactivateDevice = async (id: string | number): Promise<void> => {
  await api.post(`/admin/devices/${id}/deactivate`)
}

/**
 * Removes the device from the fleet. The API soft-deletes it, so telemetry history
 * that references the record is preserved and the row can be restored server-side —
 * unlike deactivateDevice, which leaves the device listed but switched off.
 */
export const deleteDevice = async (id: string | number): Promise<void> => {
  await api.delete(`/admin/devices/${id}`)
}

export interface HardwarePayload {
  name: string
  description?: string
  status?: boolean
  apn_id?: number
}

type RawHardware = {
  id: string | number
  attributes: {
    name: string
    description?: string | null
    status?: boolean
    apn_id?: number | null
    slug?: string | null
    created_at?: string
  }
}

function normalizeHardware(r: RawHardware): Hardware {
  return {
    id:          r.id,
    name:        r.attributes.name,
    description: r.attributes.description ?? null,
    status:      r.attributes.status,
    apn_id:      r.attributes.apn_id ?? null,
    slug:        r.attributes.slug ?? null,
    created_at:  r.attributes.created_at,
  }
}

export const listHardware = async (params?: {
  q?: string
  per_page?: number
  page?: number
}): Promise<PaginatedResponse<Hardware>> => {
  const { data } = await api.get('/admin/hardwares', { params })
  const inner = data.data
  const raw: RawHardware[] = inner?.apns ?? inner?.hardwares ?? (Array.isArray(inner) ? inner : [])
  const pg = inner?.pagination
  return {
    data: raw.map(normalizeHardware),
    meta: {
      current_page: pg?.current  ?? 1,
      last_page:    pg?.lastPage ?? 1,
      per_page:     pg?.perPage  ?? raw.length,
      total:        pg?.total    ?? raw.length,
    },
  }
}

export const createHardware = async (payload: HardwarePayload): Promise<Hardware> => {
  const { data } = await api.post('/admin/hardwares', payload)
  return data.data
}

export const updateHardware = async (
  id: string | number,
  payload: Partial<HardwarePayload>
): Promise<Hardware> => {
  const { data } = await api.patch(`/admin/hardwares/${id}`, payload)
  return data.data
}

export const deleteHardware = async (id: string | number): Promise<void> => {
  await api.delete(`/admin/hardwares/${id}`)
}

// ─── APNs ─────────────────────────────────────────────────────────────────────

export interface ApnPayload {
  name: string
  status: number  // 1 | 0
}

type RawApn = {
  id: string | number
  attributes: {
    name: string
    status: number | null
    created_at?: string
  }
}

function normalizeApn(r: RawApn): Apn {
  return {
    id:         r.id,
    name:       r.attributes.name,
    status:     r.attributes.status,
    created_at: r.attributes.created_at,
  }
}

export const listApns = async (params?: {
  q?: string
  per_page?: number
  page?: number
}): Promise<PaginatedResponse<Apn>> => {
  const { data } = await api.get('/admin/apns', { params })
  const inner = data.data
  const raw: RawApn[] = inner?.apns ?? inner?.data ?? (Array.isArray(inner) ? inner : [])
  const pg = inner?.pagination
  return {
    data: raw.map(normalizeApn),
    meta: {
      current_page: pg?.current_page ?? pg?.current ?? 1,
      last_page:    pg?.last_page   ?? pg?.lastPage  ?? 1,
      per_page:     pg?.per_page    ?? pg?.perPage   ?? raw.length,
      total:        pg?.total       ?? raw.length,
    },
  }
}

export const createApn = async (payload: ApnPayload): Promise<Apn> => {
  const { data } = await api.post('/admin/apns', payload)
  return data.data
}

export const updateApn = async (
  id: string | number,
  payload: Partial<ApnPayload>
): Promise<Apn> => {
  const { data } = await api.patch(`/admin/apns/${id}`, payload)
  return data.data
}

export const deleteApn = async (id: string | number): Promise<void> => {
  await api.delete(`/admin/apns/${id}`)
}

export const exportDevices = async (filters?: DeviceFilters): Promise<void> => {
  const response = await api.get('/admin/devices/export', {
    params: filters,
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `devices-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
