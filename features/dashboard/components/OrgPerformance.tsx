'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getOrgPerformance } from '@/features/dashboard/api'
import { Activity } from 'lucide-react'

export function OrgPerformance() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-org-performance'],
    queryFn: getOrgPerformance,
    staleTime: 60_000,
  })

  const max = data?.length ? Math.max(...data.map((d) => d.value), 1) : 1

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Top Performing Orgs</CardTitle>
          <CardDescription>Ranked by fleet activity score</CardDescription>
        </div>
        <Link href="/organizations" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No performance data available</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {data.map((org, idx) => {
              const pct = max > 0 ? (org.value / max) * 100 : 0
              const barColor =
                idx === 0 ? 'bg-primary' :
                idx === 1 ? 'bg-primary/70' :
                idx === 2 ? 'bg-primary/50' : 'bg-primary/30'

              return (
                <li key={org.name}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground">{org.name}</span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                      {org.value.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
