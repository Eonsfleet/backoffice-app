'use client'

import { useQuery } from '@tanstack/react-query'
import { Building2, Cpu, Users, Car } from 'lucide-react'
import { KpiCard } from '@/components/shared/KpiCard'
import { getDashboardMetrics } from '@/features/dashboard/api'

export function DashboardKpis() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: getDashboardMetrics,
    staleTime: 60_000,
  })

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Organizations"
        value={data?.total_organizations}
        icon={Building2}
        trend={data?.organizations_growth}
        isLoading={isLoading}
      />
      <KpiCard
        label="Total Vehicles"
        value={data?.total_vehicles}
        icon={Car}
        isLoading={isLoading}
      />
      <KpiCard
        label="Total Devices"
        value={data?.total_devices}
        icon={Cpu}
        isLoading={isLoading}
      />
      <KpiCard
        label="Total Users"
        value={data?.total_users}
        icon={Users}
        isLoading={isLoading}
      />
    </div>
  )
}
