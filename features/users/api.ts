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
  password: string
  phone_number?: string
  role?: string
  organization_id: string | number
}

export const createUser = async (payload: UserPayload): Promise<TenantUser> => {
  const { data: res } = await api.post('/users', payload)
  return normalizeUser(res.data)
}

export const listUsers = async (
  params?: UserFilters
): Promise<PaginatedResponse<TenantUser>> => {
  const { data: res } = await api.get('/users', { params })
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
  const { data: res } = await api.get(`/users/${id}`)
  const raw = res.data
  return normalizeUser(raw?.attributes ? raw : { id: String(id), attributes: raw, relationships: {} })
}

export interface UserUpdatePayload {
  first_name?: string
  last_name?: string
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
  const { data: res } = await api.patch(`/users/${id}`, payload)
  return normalizeUser(res.data)
}

export const deactivateUser = async (id: string | number): Promise<void> => {
  await api.post(`/users/${id}/deactivate`)
}

export const activateUser = async (id: string | number): Promise<void> => {
  await api.post(`/users/${id}/activate`)
}

export const deleteUser = async (id: string | number): Promise<void> => {
  await api.delete(`/users/${id}`)
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
