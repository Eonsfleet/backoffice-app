import { api } from '@/lib/api/client'
import type { TenantUser, PaginatedResponse } from '@/types/api'
import type { ImportStartedResponse } from '@/features/imports/api'

export interface UserFilters {
  page?: number
  per_page?: number
  q?: string
  status?: string
  organization_id?: string | number
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

type RawUser = {
  id: string | number
  organization_id?: string | number
  attributes: {
    first_name?: string
    last_name?: string
    full_name?: string
    email?: string
    phone_number?: string
    avatar?: string | null
    status?: string
    role?: unknown
    last_login?: string | null
    joined_date?: string
    email_verified_at?: string | null
    employee_number?: string | null
    date_of_birth?: string | null
    deleted_at?: string | null
  }
  relationships?: {
    organization?: {
      id: string | number
      attributes: { name: string; [key: string]: unknown }
    }
    current_vehicle?: { id: string | number; attributes: { registration_number?: string } } | null
    cluster?: { id: string | number; name: string } | null
  }
}

function normalizeUser(raw: RawUser): TenantUser {
  const a = raw.attributes
  const org = raw.relationships?.organization
    ? { id: raw.relationships.organization.id, name: raw.relationships.organization.attributes.name }
    : null

  // Anything other than a string is dropped: `role` is rendered straight into
  // JSX, so a stray array/object from the API would crash the whole dashboard.
  const role = typeof a.role === 'string' ? a.role : undefined

  return {
    id:               raw.id,
    name:             a.full_name ?? [a.first_name, a.last_name].filter(Boolean).join(' ') ?? '',
    email:            a.email ?? '',
    phone:            a.phone_number ?? null,
    avatar:           a.avatar ?? null,
    role,
    status:           (a.status as TenantUser['status']) ?? 'unknown',
    employee_number:  a.employee_number ?? null,
    date_of_birth:    a.date_of_birth ?? null,
    last_login:       a.last_login ?? null,
    email_verified_at: a.email_verified_at ?? null,
    created_at:       a.joined_date ?? '',
    deleted_at:       a.deleted_at ?? null,
    organization:     org,
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

export interface UserPayload {
  f_name: string
  l_name: string
  email: string
  password?: string
  phone_number?: string
  role?: string
  organization_id: string | number
}

export const createUser = async (payload: UserPayload): Promise<TenantUser> => {
  const { data: res } = await api.post('/admin/users', payload)
  return normalizeUser(res.data)
}

export const listUsers = async (
  params?: UserFilters,
  deleted = false,
): Promise<PaginatedResponse<TenantUser>> => {
  const { data: res } = await api.get(deleted ? '/admin/users/deleted' : '/admin/users', { params })
  const inner = res.data
  const raw: RawUser[] = inner?.users ?? inner?.data ?? []
  const pg = inner?.pagination

  return {
    data: raw.map(normalizeUser),
    meta: {
      current_page: pg?.current  ?? 1,
      last_page:    pg?.lastPage ?? 1,
      per_page:     pg?.perPage  ?? raw.length,
      total:        pg?.total    ?? raw.length,
    },
  }
}

export const getUser = async (id: string | number): Promise<TenantUser> => {
  const { data: res } = await api.get(`/admin/users/${id}`)
  const raw = res.data
  return normalizeUser(raw?.attributes ? raw : { id: String(id), attributes: raw, relationships: {} })
}

export interface UserUpdatePayload {
  f_name?: string
  l_name?: string
  email?: string
  phone_number?: string
  role?: string
  organization_id?: string | number
  status?: string
}

export const updateUser = async (
  id: string | number,
  payload: UserUpdatePayload
): Promise<TenantUser> => {
  const { data: res } = await api.patch(`/admin/users/${id}`, payload)
  return normalizeUser(res.data)
}

export const deactivateUser = async (id: string | number): Promise<void> => {
  await api.patch(`/admin/users/${id}`, { status: 'inactive' })
}

export const activateUser = async (id: string | number): Promise<void> => {
  await api.patch(`/admin/users/${id}`, { status: 'active' })
}

/** Email the user a fresh link to set their password. Only valid for a user who has never logged in. */
export const resendInvite = async (id: string | number): Promise<void> => {
  await api.post(`/admin/users/${id}/resend-invite`)
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const exportUsers = async (
  params: UserFilters & { format?: 'excel' | 'csv' } = {}
): Promise<void> => {
  const format = params.format ?? 'excel'
  const response = await api.get('/admin/users/export', {
    params: { ...params, format },
    responseType: 'blob',
  })
  const ext = format === 'excel' ? 'xlsx' : 'csv'
  triggerBlobDownload(response.data as Blob, `users_export_${Date.now()}.${ext}`)
}

export const downloadUserTemplate = async (): Promise<void> => {
  const response = await api.get('/admin/users/export/template', { responseType: 'blob' })
  triggerBlobDownload(response.data as Blob, 'users_import_template.xlsx')
}

export const importUsers = async (
  organizationId: string | number,
  file: File
): Promise<ImportStartedResponse> => {
  const form = new FormData()
  form.append('file', file)
  form.append('model', 'User')
  form.append('organization_id', String(organizationId))
  const { data: res } = await api.post('/admin/file/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data as ImportStartedResponse
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export interface ActivityLogEntry {
  id: string | number
  description: string | null
  resource_type: string
  resource_id: string | number | null
  action: string
  changed_by: { id: string | number; name: string | null; email: string | null }
  changed_at: string
  changes: Record<string, { from: unknown; to: unknown }> | null
}

export interface ActivityLogFilters {
  page?: number
  per_page?: number
  resource_type?: string
  action?: string
  from_date?: string
  to_date?: string
}

export const getUserActivityLog = async (
  userId: string | number,
  params?: ActivityLogFilters
): Promise<{ data: ActivityLogEntry[]; meta: { total: number; per_page: number; current_page: number; last_page: number } }> => {
  const { data: res } = await api.get(`/admin/users/${userId}/activity-log`, { params })
  return res
}

export const exportUserActivityLog = async (
  userId: string | number,
  params?: Omit<ActivityLogFilters, 'page' | 'per_page'>
): Promise<void> => {
  const response = await api.get(`/admin/users/${userId}/activity-log`, {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  })
  triggerBlobDownload(response.data as Blob, `activity_log_${userId}_${Date.now()}.csv`)
}

export const deleteUser = async (id: string | number): Promise<void> => {
  await api.delete(`/admin/users/${id}`)
}

export interface UserMetrics {
  total: number
  active: number
  inactive: number
  new_this_month: number
}

export const getUserMetrics = async (): Promise<UserMetrics> => {
  const { data: res } = await api.get('/admin/analytics/users/summary')
  return res.data
}

export const bulkDeleteUsers = async (ids: Array<string | number>): Promise<void> => {
  await api.delete('/admin/users/bulk', { data: { ids } })
}

export const listDeletedUsers = (params?: UserFilters) => listUsers(params, true)

export const restoreDeletedUsers = async (ids: Array<string | number>): Promise<void> => {
  await api.post('/admin/users/deleted/restore', { ids })
}

export const permanentlyDeleteUsers = async (ids: Array<string | number>): Promise<void> => {
  await api.delete('/admin/users/deleted/bulk', { data: { ids } })
}

export type DriverProfile = TenantUser & {
  vehicle?: { id: string | number; plate_number?: string } | null
  cluster?: { id: string | number; name: string } | null
}

export async function listDrivers(params: { q?: string; page: number; per_page: number }, signal?: AbortSignal): Promise<PaginatedResponse<DriverProfile>> {
  const { data } = await api.get('/admin/users/role/driver', { params, signal })
  const inner = data.data
  if (!Array.isArray(inner?.users) || !inner.pagination) throw new Error('Invalid driver directory response')
  const records: RawUser[] = inner.users
  return {
    data: records.map(raw => ({ ...normalizeUser(raw),
      vehicle: raw.relationships?.current_vehicle ? { id: raw.relationships.current_vehicle.id, plate_number: raw.relationships.current_vehicle.attributes.registration_number } : null,
      cluster: raw.relationships?.cluster,
    })),
    meta: { current_page: inner.pagination.current, last_page: inner.pagination.lastPage, per_page: inner.pagination.perPage, total: inner.pagination.total },
  }
}
