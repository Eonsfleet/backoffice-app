import Pusher from 'pusher-js'
import { env } from '@/lib/env'

let pusherInstance: Pusher | null = null

export function getPusherClient(token: string): Pusher {
  if (pusherInstance) return pusherInstance

  pusherInstance = new Pusher(env.pusherKey, {
    wsHost: env.reverbHost,
    wsPort: 443,
    forceTLS: true,
    cluster: env.pusherCluster,
    authEndpoint: `${env.apiUrl}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Request-Type': 'admin',
      },
    },
  })

  return pusherInstance
}

export function disconnectPusher() {
  if (pusherInstance) {
    pusherInstance.disconnect()
    pusherInstance = null
  }
}
