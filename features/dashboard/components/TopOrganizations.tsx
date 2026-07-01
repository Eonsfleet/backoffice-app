'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardOrganizations } from '@/features/dashboard/api'
import { Building2 } from 'lucide-react'

export function TopOrganizations() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-organizations'],
    queryFn: getDashboardOrganizations,
    staleTime: 60_000,
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Top Organizations</CardTitle>
          <CardDescription>Largest fleets currently on the platform</CardDescription>
        </div>
        <Link href="/organizations" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No organizations found</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((org, idx) => (
              <li key={org.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/organizations/${org.id}`}
                    className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {org.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {(org.total_vehicles ?? org.fleet_size ?? 0).toLocaleString()} vehicles
                    {' · '}
                    {org.total_devices ?? 0} devices
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
