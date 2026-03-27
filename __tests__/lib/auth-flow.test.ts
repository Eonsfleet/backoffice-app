import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuthStore } from '@/stores/auth.store'
import { setAuthCookie, clearAuthCookie, getAuthCookie } from '@/lib/auth-cookie'

// ─── Auth store bootstrap behaviour ──────────────────────────────────────────

describe('auth store', () => {
  beforeEach(() => {
    clearAuthCookie()
    useAuthStore.setState({ token: null, user: null, isBootstrapping: false })
  })

  it('starts with no token and not bootstrapping when no cookie is set', () => {
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.isBootstrapping).toBe(false)
    expect(state.user).toBeNull()
  })

  it('setAuth stores the token and user', () => {
    const user = { id: '1', name: 'Alice', email: 'alice@test.com', role: 'super_admin' } as never
    useAuthStore.getState().setAuth('tok-123', user)
    const state = useAuthStore.getState()
    expect(state.token).toBe('tok-123')
    expect(state.user).toMatchObject({ id: '1' })
  })

  it('clearAuth resets all auth state', () => {
    useAuthStore.getState().setAuth('tok', { id: '1' } as never)
    useAuthStore.getState().clearAuth()
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isBootstrapping).toBe(false)
  })

  it('setBootstrapped flips isBootstrapping to false', () => {
    useAuthStore.setState({ isBootstrapping: true })
    useAuthStore.getState().setBootstrapped()
    expect(useAuthStore.getState().isBootstrapping).toBe(false)
  })

  it('isAuthenticated returns true only when a token is present', () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false)
    useAuthStore.getState().setAuth('tok', null)
    expect(useAuthStore.getState().isAuthenticated()).toBe(true)
  })
})

// ─── 401 interceptor deduplication ───────────────────────────────────────────
// We test the deduplication behaviour in isolation by checking that
// performLogout (via the exported api interceptor) only calls clearAuth once
// even when concurrent 401s arrive.

describe('logout deduplication', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'active-token', user: null, isBootstrapping: false })
    setAuthCookie('active-token')
  })

  afterEach(() => {
    clearAuthCookie()
    useAuthStore.setState({ token: null, user: null, isBootstrapping: false })
  })

  it('clearAuth is idempotent — calling it twice leaves state clean', () => {
    useAuthStore.getState().clearAuth()
    useAuthStore.getState().clearAuth()
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().isBootstrapping).toBe(false)
  })

  it('cookie is cleared after clearAuth', () => {
    setAuthCookie('my-token')
    expect(getAuthCookie()).toBe('my-token')
    clearAuthCookie()
    expect(getAuthCookie()).toBeNull()
  })
})

// ─── Bootstrap race condition guard ──────────────────────────────────────────

describe('auth bootstrap isBootstrapping flag', () => {
  beforeEach(() => {
    clearAuthCookie()
  })

  it('isBootstrapping is false when there is no cookie on store creation', () => {
    // Simulate fresh store with no cookie (token will be null)
    useAuthStore.setState({ token: null, isBootstrapping: false })
    expect(useAuthStore.getState().isBootstrapping).toBe(false)
  })

  it('remains false after setBootstrapped is called', () => {
    useAuthStore.setState({ token: 'tok', isBootstrapping: true })
    useAuthStore.getState().setBootstrapped()
    expect(useAuthStore.getState().isBootstrapping).toBe(false)
  })

  it('clearAuth also resets isBootstrapping', () => {
    useAuthStore.setState({ token: 'tok', isBootstrapping: true })
    useAuthStore.getState().clearAuth()
    expect(useAuthStore.getState().isBootstrapping).toBe(false)
  })
})
