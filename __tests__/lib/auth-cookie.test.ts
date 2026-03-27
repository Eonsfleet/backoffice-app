import { describe, it, expect, beforeEach } from 'vitest'
import { getAuthCookie, setAuthCookie, clearAuthCookie } from '@/lib/auth-cookie'

// jsdom exposes document.cookie as a writable string
function resetCookies() {
  // Clear all cookies by expiring them
  document.cookie.split(';').forEach((c) => {
    const name = c.trim().split('=')[0]
    document.cookie = `${name}=; max-age=0; path=/`
  })
}

describe('getAuthCookie', () => {
  beforeEach(resetCookies)

  it('returns null when no cookie is set', () => {
    expect(getAuthCookie()).toBeNull()
  })

  it('returns the token after setAuthCookie', () => {
    setAuthCookie('test-token-abc')
    expect(getAuthCookie()).toBe('test-token-abc')
  })

  it('handles token values that contain = signs', () => {
    const token = 'base64token==value'
    setAuthCookie(token)
    expect(getAuthCookie()).toBe(token)
  })
})

describe('clearAuthCookie', () => {
  beforeEach(resetCookies)

  it('removes the token', () => {
    setAuthCookie('some-token')
    clearAuthCookie()
    expect(getAuthCookie()).toBeNull()
  })
})
