'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Building2, Loader2, Shield, UserCog } from 'lucide-react'
import { listAuditLogs } from '@/features/audit-logs/api'
import { QueryError } from '@/components/shared/QueryError'
import { RiskBadge } from '@/components/shared/RiskBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const PER_PAGE = 20

/**
 * Platform audit trail scoped to one organization: actions taken by internal
 * admins and by the organization's own users, from /admin/audit-logs.
 */
export function OrgAuditTrail({ organizationId }: { organizationId: string | number }) {
  const { data, isPending, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = useInfiniteQuery({
    queryKey: ['org-audit-trail', organizationId],
    queryFn: ({ pageParam }) => listAuditLogs({ organization_id: organizationId, page: pageParam, per_page: PER_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
    staleTime: 30_000,
  })

  const logs = data?.pages.flatMap((p) => p.data) ?? []
  const total = data?.pages[0]?.meta.total

  if (isPending) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
  if (error && !logs.length) return <QueryError error={error} retry={() => void refetch()} label="the audit trail" />
  if (!logs.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <Shield className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No audit events recorded for this organization yet.</p>
      </div>
    )
  }

  return (
    <div>
      {total != null && <p className="mb-3 text-xs text-muted-foreground">Showing {logs.length} of {total} events</p>}
      <ul className="divide-y divide-border">
        {logs.map((log) => {
          const isAdmin = log.actor_type === 'admin'
          const Icon = isAdmin ? UserCog : Building2
          return (
            <li key={`${log.source ?? 'log'}-${log.id}`} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-foreground">{log.description || log.action}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{log.actor?.name ?? 'System'}</span>
                  <span>·</span>
                  <span>{isAdmin ? 'Internal admin' : log.actor_type === 'tenant_user' ? 'Organization user' : 'System'}</span>
                  {log.method && log.path && <>
                    <span>·</span>
                    <span className="truncate font-mono text-muted-foreground/70">{log.method} {log.path}</span>
                  </>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <RiskBadge level={log.risk_level} className="text-[10px]" />
                <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      {isFetchNextPageError && <QueryError error={error} retry={() => void fetchNextPage()} label="more audit events" />}
      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}Load more
          </Button>
        </div>
      )}
    </div>
  )
}
