import { CircleDashed, Wifi, WifiOff } from 'lucide-react'

export function DeviceStatusIcon({ status }: { status?: string | null }) {
  if (!status) return <CircleDashed className="h-3.5 w-3.5 text-muted-foreground/40" />
  if (status === 'online') return <Wifi className="h-3.5 w-3.5 text-emerald-500" />
  if (status === 'offline') return <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
  return <CircleDashed className="h-3.5 w-3.5 text-blue-500" />
}
