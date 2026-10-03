'use client'

import { QueryError } from '@/components/shared/QueryError'

import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/shared/RiskBadge'
import { listAuditLogs } from '@/features/audit-logs/api'
import { Shield } from 'lucide-react'

export function RecentActivity() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-recent-activity'],
    queryFn: () => listAuditLogs({ per_page: 8 }),
    staleTime: 30_000,
  })

  if (error) return <QueryError error={error} retry={() => void refetch()} />

  const logs = data?.data ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Latest admin actions across the platform</CardDescription>
        </div>
        <Link
          href="/audit-logs"
          className="text-xs text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Shield className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground uppercase">
                  {log.admin?.name?.[0] ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.admin?.name ?? 'Unknown'}{log.organization ? ` · ${log.organization.name}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <RiskBadge level={log.risk_level} />
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
