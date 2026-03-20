import { api } from '@/lib/api/client'
import type { AdminUser, PaginatedResponse } from '@/types/api'
import { normalizePaginated } from '@/lib/api/utils'

export const listAdminUsers = async (params?: {
  page?: number
  per_page?: number
  q?: string
}): Promise<PaginatedResponse<AdminUser>> => {
  const { data } = await api.get('/admins', { params })
  return normalizePaginated<AdminUser>(data)
}

export const getAdminUser = async (id: string | number): Promise<AdminUser> => {
  const { data } = await api.get(`/admins/${id}`)
  return data.data
}

export const createAdminUser = async (payload: {
  name: string
  email: string
  phone_number?: string
  role: string
}): Promise<AdminUser> => {
  const { data } = await api.post('/admins', payload)
  return data.data
}

export const updateAdminUser = async (
  id: string | number,
  payload: Partial<AdminUser> & { force_password_reset?: boolean }
): Promise<AdminUser> => {
  const { data } = await api.patch(`/admins/${id}`, payload)
  return data.data
}

export const deactivateAdminUser = async (id: string | number): Promise<void> => {
  await api.post(`/admins/${id}/deactivate`)
}

export const deleteAdminUser = async (id: string | number): Promise<void> => {
  await api.delete(`/admins/${id}`)
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export interface AdminRole {
  id: string | number
  name: string
  slug?: string
  is_custom?: boolean
  permissions?: string[]
}

export { listRoles as listAdminRoles } from '@/features/roles/api'

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
