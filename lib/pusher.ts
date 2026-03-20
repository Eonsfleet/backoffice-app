import Pusher from 'pusher-js'

let pusherInstance: Pusher | null = null

export function getPusherClient(token: string): Pusher {
  if (pusherInstance) return pusherInstance

  pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
    wsPort: 443,
    forceTLS: true,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'mt1',
    authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/broadcasting/auth`,
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
