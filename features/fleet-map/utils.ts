import type { Vehicle } from '@/types/api'

export type MarkerStatus = 'moving' | 'idle' | 'offline'

export function getVehicleMapStatus(v: Vehicle): MarkerStatus {
  if (!v.current_location) return 'offline'
  if (v.is_online === false || (v.is_online == null && v.device_status === 'offline')) return 'offline'
  return (v.current_location.speed ?? 0) > 0 ? 'moving' : 'idle'
}
