import { api } from '@/lib/api/client'
import type { AdminUser } from '@/types/api'

interface LoginPayload {
  email: string
  password: string
}

interface LoginResult {
  token: string
  user: AdminUser
}

const COOKIE_NAME = 'eonsfleet-token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// ─── Cookie helpers (client-side only) ───────────────────────────────────────

export function setAuthCookie(token: string) {
  document.cookie = `${COOKIE_NAME}=${token}; path=/; SameSite=Strict; max-age=${COOKIE_MAX_AGE}`
}

export function clearAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
}

export function getAuthCookie(): string | null {
  const match = document.cookie
    .split(';')
    .find((c) => c.trim().startsWith(`${COOKIE_NAME}=`))
  return match ? match.trim().split('=').slice(1).join('=') : null
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
