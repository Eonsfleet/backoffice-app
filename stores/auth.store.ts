import { create } from 'zustand'
import type { AdminUser } from '@/types/api'

interface AuthState {
  token: string | null
  user: AdminUser | null
  setAuth: (token: string, user: AdminUser | null) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

const COOKIE_NAME = 'eonsfleet-token'

// Read the auth cookie synchronously so the token is available
// before any React effects (including TanStack Query) fire.
function readTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split(';')
    .find((c) => c.trim().startsWith(`${COOKIE_NAME}=`))
  return match ? match.trim().split('=').slice(1).join('=') : null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: readTokenFromCookie(),
  user: null,
  setAuth: (token, user) => set({ token, user }),
  clearAuth: () => set({ token: null, user: null }),
  isAuthenticated: () => get().token !== null,
}))
