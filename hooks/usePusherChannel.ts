'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import type { Channel } from 'pusher-js'
import { getPusherClient } from '@/lib/pusher'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Subscribe to a Pusher/Reverb channel and listen for events.
 *
 * @param channelName - e.g. "location.organization.42"
 * @param eventName   - e.g. "LocationUpdated"
 * @param onEvent     - callback invoked with the event payload
 * @param enabled     - set to false to skip subscription (e.g. while loading)
 */
export function usePusherChannel<T = unknown>(
  channelName: string,
  eventName: string,
  onEvent: (data: T) => void,
  enabled = true
) {
  const token = useAuthStore((s) => s.token)
  const callbackRef = useRef(onEvent)
  useLayoutEffect(() => { callbackRef.current = onEvent })

  useEffect(() => {
    if (!enabled || !token || !channelName) return

    const pusher = getPusherClient(token)
    let channel: Channel | null = null

    try {
      channel = pusher.subscribe(channelName)
      channel.bind(eventName, (data: T) => {
        callbackRef.current(data)
      })
    } catch (err) {
      console.error(`[Pusher] Failed to subscribe to "${channelName}":`, err)
      return
    }

    return () => {
      if (channel) {
        channel.unbind(eventName)
      }
      pusher.unsubscribe(channelName)
    }
  }, [channelName, eventName, token, enabled])
}
