'use client'

import { useState, useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { getAuthCookie, getAdminProfile } from '@/features/auth/api'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  })
}

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setBootstrapped = useAuthStore((s) => s.setBootstrapped)
  const bootstrapped = useRef(false)

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    const token = getAuthCookie()
    if (token) {
      // Set token immediately so the Axios interceptor has it before any queries fire.
      // User profile is filled in asynchronously; isBootstrapping stays true until resolved.
      setAuth(token, null)
      getAdminProfile()
        .then((user) => setAuth(token, user))
        .catch(() => clearAuth())
        .finally(() => setBootstrapped())
    } else {
      setBootstrapped()
    }
  }, [setAuth, clearAuth, setBootstrapped])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures each browser session gets its own QueryClient instance
  const [queryClient] = useState(() => makeQueryClient())
  useEffect(() => { void useUIStore.persist.rehydrate() }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </AuthBootstrap>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
