import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'X-Request-Type': 'admin',
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split(';').find((c) => c.trim().startsWith('eonsfleet-token='))
  return match ? match.trim().split('=').slice(1).join('=') : null
}

// Inject Bearer token on every request.
// Prefer the in-memory Zustand store; fall back to the cookie directly
// to cover the narrow window before AuthBootstrap's useEffect fires.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token ?? getTokenFromCookie()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 401 → only act if the user had an active session (token exists in store).
// Skips login/logout endpoints to avoid redirect loops or spurious logout calls.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? ''
      const isAuthEndpoint = url.includes('/auth/admin/login') || url.includes('/auth/admin/logout') || url.includes('/auth/admin/me')
      const hasSession = !!useAuthStore.getState().token

      if (!isAuthEndpoint && hasSession && typeof window !== 'undefined') {
        useAuthStore.getState().clearAuth()
        document.cookie = 'eonsfleet-token=; path=/; max-age=0'
        await api.get('/auth/admin/logout').catch(() => null)
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/file/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data?.data?.file?.url ?? res.data?.url ?? res.data
}
