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

// ─── Auth API calls ───────────────────────────────────────────────────────────

export async function loginAdmin(payload: LoginPayload): Promise<LoginResult> {
  const { data } = await api.post('/auth/admin/login', payload)
  return data.data // { token, user }
}

export async function logoutAdmin(): Promise<void> {
  await api.get('/auth/admin/logout').catch(() => null)
}

export async function getAdminProfile(): Promise<AdminUser> {
  const { data } = await api.get('/auth/admin/me')
  return data.data
}
