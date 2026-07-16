import { Car, CircleDashed, Cpu, ShieldCheck, TrendingUp, Truck } from 'lucide-react'

import { KpiCard } from '@/components/shared/KpiCard'

interface VehicleMetricsProps {
  metrics?: {
    total?: number
    active?: number
    maintenance?: number
    with_device?: number
    without_device?: number
    inactive?: number
  }
  isLoading?: boolean
}

export function VehicleMetrics({ metrics, isLoading }: VehicleMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <KpiCard label="Total Vehicles" value={metrics?.total} icon={Truck} isLoading={isLoading} />
      <KpiCard label="Active" value={metrics?.active} icon={ShieldCheck} isLoading={isLoading} iconClassName="bg-emerald-500/10" />
      <KpiCard label="Maintenance" value={metrics?.maintenance} icon={Car} isLoading={isLoading} iconClassName="bg-amber-500/10" />
      <KpiCard label="With Device" value={metrics?.with_device} icon={Cpu} isLoading={isLoading} iconClassName="bg-blue-500/10" />
      <KpiCard label="Without Device" value={metrics?.without_device} icon={CircleDashed} isLoading={isLoading} iconClassName="bg-muted" />
      <KpiCard label="Inactive" value={metrics?.inactive} icon={TrendingUp} isLoading={isLoading} iconClassName="bg-red-500/10" />
    </div>
  )
}
