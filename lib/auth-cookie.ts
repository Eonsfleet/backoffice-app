/**
 * Canonical auth-cookie helpers.
 *
 * Centralised here to avoid the same cookie-parsing logic being duplicated
 * in features/auth/api.ts, stores/auth.store.ts, and lib/api/client.ts.
 *
 * These helpers are browser-only. They each guard against SSR with a
 * `typeof document === 'undefined'` check so they are safe to import in
 * any context.
 */

const COOKIE_NAME = 'eonsfleet-token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export function getAuthCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split(';')
    .find((c) => c.trim().startsWith(`${COOKIE_NAME}=`))
  return match ? match.trim().split('=').slice(1).join('=') : null
}

export function setAuthCookie(token: string): void {
  if (typeof document === 'undefined') return
  // NOTE: HttpOnly cannot be set from JS — the backend login endpoint should
  // set an HttpOnly cookie. This cookie is a client-side fallback so the Axios
  // interceptor can read the token before React hydrates.
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE_NAME}=${token}; path=/; SameSite=Strict; max-age=${COOKIE_MAX_AGE}${secure}`
}

export function clearAuthCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
}
