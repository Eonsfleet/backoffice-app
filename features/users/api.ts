import { api } from '@/lib/api/client'
import type { TenantUser, PaginatedResponse } from '@/types/api'

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
    role?: string | unknown[]
    last_login?: string | null
    joined_date?: string
    email_verified_at?: string | null
    employee_number?: string | null
    date_of_birth?: string | null
  }
  relationships?: {
    organization?: {
      id: string | number
      attributes: { name: string; [key: string]: unknown }
    }
  }
}

function normalizeUser(raw: RawUser): TenantUser {
  const a = raw.attributes
  const org = raw.relationships?.organization
    ? { id: raw.relationships.organization.id, name: raw.relationships.organization.attributes.name }
    : null

  const role = Array.isArray(a.role) ? undefined : (a.role as string | undefined)

  return {
    id:               raw.id,
    name:             a.full_name ?? [a.first_name, a.last_name].filter(Boolean).join(' ') ?? '',
    email:            a.email ?? '',
    phone:            a.phone_number ?? null,
    avatar:           a.avatar ?? null,
    role,
    status:           (a.status as TenantUser['status']) ?? 'active',
    employee_number:  a.employee_number ?? null,
    date_of_birth:    a.date_of_birth ?? null,
    last_login:       a.last_login ?? null,
    email_verified_at: a.email_verified_at ?? null,
    created_at:       a.joined_date ?? '',
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
  params?: UserFilters
): Promise<PaginatedResponse<TenantUser>> => {
  const { data: res } = await api.get('/admin/users', { params })
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
  organizationId: string | number,
  format: 'excel' | 'csv' = 'excel'
): Promise<void> => {
  const response = await api.get('/admin/users/export', {
    params: { organization_id: organizationId, format },
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
): Promise<string> => {
  const form = new FormData()
  form.append('file', file)
  form.append('model', 'User')
  form.append('organization_id', String(organizationId))
  const { data: res } = await api.post('/admin/file/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data?.batch_id as string
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
