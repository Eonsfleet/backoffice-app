import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'
import { getAuthCookie, clearAuthCookie } from '@/lib/auth-cookie'
import { env } from '@/lib/env'
import { captureError } from '@/lib/monitoring'

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: {
    'X-Request-Type': 'admin',
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// Inject Bearer token on every request.
// Prefer the in-memory Zustand store; fall back to the cookie directly
// to cover the narrow window before AuthBootstrap's useEffect fires.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token ?? getAuthCookie()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Only the admin profile endpoint is authoritative for session validity.
// Other endpoints can return 401 because of permission or route guard mismatches;
// clearing the session there makes a recoverable API issue feel like a logout.
// A single logout promise is shared across concurrent authoritative 401s.
let logoutInFlight: Promise<void> | null = null

function performLogout(): Promise<void> {
  if (logoutInFlight) return logoutInFlight

  logoutInFlight = (async () => {
    await api.post('/auth/admin/logout').catch(() => null)
    useAuthStore.getState().clearAuth()
    clearAuthCookie()
    window.location.replace('/login')
  })()

  return logoutInFlight
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? ''
      const shouldEndSession = url.includes('/auth/admin/me')
      const hasSession = !!useAuthStore.getState().token

      if (shouldEndSession && hasSession && typeof window !== 'undefined') {
        await performLogout()
      }
    }
    // Report unexpected (non-401, non-network) errors to monitoring
    if (axios.isAxiosError(error) && error.response && error.response.status >= 500) {
      captureError(error, {
        url: error.config?.url,
        status: error.response.status,
      })
    }

    return Promise.reject(error)
  }
)

const UPLOAD_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const UPLOAD_ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

export const uploadFile = async (file: File): Promise<string> => {
  if (file.size > UPLOAD_MAX_BYTES) {
    throw new Error(`File too large. Maximum allowed size is ${UPLOAD_MAX_BYTES / 1024 / 1024} MB.`)
  }
  if (!UPLOAD_ALLOWED_TYPES.has(file.type)) {
    throw new Error(`File type "${file.type}" is not allowed. Allowed types: JPEG, PNG, WebP, GIF, PDF.`)
  }

  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/file/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  const url = res.data?.data?.file?.url ?? res.data?.url ?? res.data
  if (typeof url !== 'string' || !url) {
    throw new Error('File upload succeeded but the server returned no URL.')
  }
  return url
}
