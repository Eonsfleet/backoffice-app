import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminProfile } from '../types'

interface AuthState {
    token: string | null
    admin: AdminProfile | null
    setAuth: (token: string, admin: AdminProfile) => void
    clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            admin: null,
            setAuth: (token, admin) => set({ token, admin }),
            clearAuth: () => set({ token: null, admin: null }),
        }),
        { name: 'eonsfleet-admin-auth' }
    )
)
