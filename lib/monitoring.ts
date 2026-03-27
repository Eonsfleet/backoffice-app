/**
 * Monitoring / error-reporting facade.
 *
 * Currently a stub — all calls are no-ops that log to the console in
 * development. To activate Sentry:
 *
 *   1. Install the package:
 *        npm install @sentry/nextjs
 *
 *   2. Run the Sentry wizard or manually add sentry.client.config.ts /
 *      sentry.server.config.ts per the Sentry Next.js docs.
 *
 *   3. Set NEXT_PUBLIC_SENTRY_DSN in .env.local (already present in env.ts).
 *
 *   4. Replace the stub bodies below with the real Sentry calls, e.g.:
 *        import * as Sentry from '@sentry/nextjs'
 *        export const captureError = Sentry.captureException
 *        export const captureMessage = Sentry.captureMessage
 *        export const setUser = Sentry.setUser
 */

const isDev = process.env.NODE_ENV === 'development'

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (isDev) {
    console.error('[monitoring] captureError:', error, context)
  }
  // TODO: Sentry.captureException(error, { extra: context })
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (isDev) {
    console.warn(`[monitoring] captureMessage (${level}):`, message)
  }
  // TODO: Sentry.captureMessage(message, level)
}

export function setMonitoringUser(user: { id: string | number; email?: string; name?: string } | null): void {
  if (isDev) {
    console.info('[monitoring] setUser:', user)
  }
  // TODO: Sentry.setUser(user)
}
