import { api } from '@/lib/api/client'
import type { AdminUser, PaginatedResponse } from '@/types/api'
import { normalizePaginated } from '@/lib/api/utils'

export const listAdminUsers = async (params?: {
  page?: number
  per_page?: number
  q?: string
}): Promise<PaginatedResponse<AdminUser>> => {
  const { data } = await api.get('/admin/admins', { params })
  return normalizePaginated<AdminUser>(data)
}

export const getAdminUser = async (id: string | number): Promise<AdminUser> => {
  const { data } = await api.get(`/admin/admins/${id}`)
  return data.data
}

export const createAdminUser = async (payload: {
  name: string
  email: string
  phone_number?: string
  role: string
}): Promise<AdminUser> => {
  const { data } = await api.post('/admin/admins', payload)
  return data.data
}

export const updateAdminUser = async (
  id: string | number,
  payload: Partial<AdminUser> & { force_password_reset?: boolean }
): Promise<AdminUser> => {
  const { data } = await api.patch(`/admin/admins/${id}`, payload)
  return data.data
}

export const deactivateAdminUser = async (id: string | number): Promise<void> => {
  void id
  throw new Error('Admin deactivation is not supported by the backend yet.')
}

export const deleteAdminUser = async (id: string | number): Promise<void> => {
  await api.delete(`/admin/admins/${id}`)
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export interface AdminRole {
  id: string | number
  name: string
  slug?: string
  is_custom?: boolean
  permissions?: string[]
}

type RawAdminRole = {
  id: string | number
  attributes?: {
    name?: string
    slug?: string
    is_custom?: boolean
    permissions?: string[]
  }
  name?: string
  slug?: string
  is_custom?: boolean
  permissions?: string[]
}

export const listAdminRoles = async (): Promise<AdminRole[]> => {
  const { data: res } = await api.get('/admin/roles', { params: { guard_name: 'admin' } })
  const raw: RawAdminRole[] = res.data?.adminroles ?? res.data?.roles ?? res.data?.data ?? []
  return raw.map((r) => ({
    id:          r.id,
    name:        r.attributes?.name  ?? r.name  ?? '',
    slug:        r.attributes?.slug  ?? r.slug,
    is_custom:   r.attributes?.is_custom  ?? r.is_custom,
    permissions: r.attributes?.permissions ?? r.permissions ?? [],
  }))
}

export const createRole = async (payload: { name: string; permissions: string[] }): Promise<AdminRole> => {
  const { data } = await api.post('/admin/roles', payload)
  return data.data
}

export const updateRole = async (
  id: string | number,
  payload: { name?: string; permissions?: string[] }
): Promise<AdminRole> => {
  const { data } = await api.put(`/admin/roles/${id}`, payload)
  return data.data
}

export const deleteRole = async (id: string | number): Promise<void> => {
  await api.delete(`/admin/roles/${id}`)
}
