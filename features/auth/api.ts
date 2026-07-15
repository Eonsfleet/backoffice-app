import { api } from '@/lib/api/client'
import { getAuthCookie, setAuthCookie, clearAuthCookie } from '@/lib/auth-cookie'
import type { AdminUser } from '@/types/api'

export { getAuthCookie, setAuthCookie, clearAuthCookie }

interface LoginPayload {
  email: string
  password: string
}

interface LoginResult {
  token: string
  user: AdminUser
}

function unwrapAuthUser(data: { data?: AdminUser } | AdminUser): AdminUser {
  return 'data' in data && data.data ? data.data : data as AdminUser
}

// ─── Auth API calls ───────────────────────────────────────────────────────────

export async function loginAdmin(payload: LoginPayload): Promise<LoginResult> {
  const { data } = await api.post('/auth/admin/login', payload)
  return data.data // { token, user }
}

export async function logoutAdmin(): Promise<void> {
  await api.post('/auth/admin/logout').catch(() => null)
}

export async function getAdminProfile(): Promise<AdminUser> {
  const { data } = await api.get('/auth/admin/me')
  return unwrapAuthUser(data)
}

export async function updateAdminProfile(payload: {
  name?: string
  email?: string
  avatar?: string | null
  phone_number?: string | null
}): Promise<AdminUser> {
  const { data } = await api.patch('/auth/admin/profile', payload)
  return unwrapAuthUser(data)
}

export async function updateAdminPassword(payload: {
  current_password: string
  new_password: string
  new_password_confirmation: string
}): Promise<void> {
  await api.patch('/auth/admin/password', payload)
}

export interface AdminSession {
  id: string
  ip: string
  user_agent: string
  last_active: string
  is_current: boolean
}

export async function getAdminSessions(): Promise<AdminSession[]> {
  const { data } = await api.get('/auth/admin/sessions')
  return data.data ?? []
}

export async function revokeAdminSession(id: string): Promise<void> {
  await api.delete(`/auth/admin/sessions/${id}`)
}
