import { create } from 'zustand'
import { getAuthCookie } from '@/lib/auth-cookie'
import { setMonitoringUser } from '@/lib/monitoring'
import type { AdminUser } from '@/types/api'

interface AuthState {
  token: string | null
  user: AdminUser | null
  /** True while the bootstrap effect is resolving the profile from the server. */
  isBootstrapping: boolean
  setAuth: (token: string, user: AdminUser | null) => void
  setBootstrapped: () => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Read synchronously so the token is available before React effects fire.
  token: getAuthCookie(),
  user: null,
  // Bootstrapping starts as true only when a token exists — otherwise there's
  // nothing to resolve and pages can render immediately.
  isBootstrapping: getAuthCookie() !== null,
  setAuth: (token, user) => {
    set({ token, user })
    if (user) setMonitoringUser({ id: user.id, email: user.email, name: user.name })
  },
  setBootstrapped: () => set({ isBootstrapping: false }),
  clearAuth: () => {
    set({ token: null, user: null, isBootstrapping: false })
    setMonitoringUser(null)
  },
  isAuthenticated: () => get().token !== null,
}))
