/**
 * Centralised environment variable access with fail-fast validation.
 *
 * IMPORTANT: Next.js replaces NEXT_PUBLIC_* variables at build time via static
 * analysis. This only works with literal property access (process.env.NEXT_PUBLIC_FOO),
 * NOT dynamic bracket access (process.env[name]). Each variable must be read
 * with its full literal name here.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `[env] Required environment variable "${name}" is not set. ` +
      `Add it to your .env.local file and restart the dev server.`
    )
  }
  return value
}

export const env = {
  apiUrl:        required(process.env.NEXT_PUBLIC_API_BASE_URL,   'NEXT_PUBLIC_API_BASE_URL'),
  pusherKey:     required(process.env.NEXT_PUBLIC_PUSHER_APP_KEY, 'NEXT_PUBLIC_PUSHER_APP_KEY'),
  reverbHost:    required(process.env.NEXT_PUBLIC_PUSHER_HOST,    'NEXT_PUBLIC_PUSHER_HOST'),
  pusherCluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'mt1',
  mapboxToken:   process.env.NEXT_PUBLIC_MAPBOX_TOKEN   ?? '',
  sentryDsn:     process.env.NEXT_PUBLIC_SENTRY_DSN     ?? '',
} as const
