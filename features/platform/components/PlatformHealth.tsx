'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Activity } from 'lucide-react'
import { getPlatformHealth } from '../api'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryError } from '@/components/shared/QueryError'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Timestamp } from '@/components/shared/Timestamp'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function PlatformHealth({ compact = false }: { compact?: boolean }) {
  const query = useQuery({ queryKey: ['platform-health'], queryFn: ({ signal }) => getPlatformHealth(signal), staleTime: 60_000, retry: 1 })
  const refresh = <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />Refresh</Button>
  const result = query.isError ? <QueryError error={query.error} retry={() => void query.refetch()} label="service health" /> : query.isPending ? <Skeleton className="h-32 w-full" /> : query.data ? <>
    <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={query.data.status} /><Timestamp value={query.data.timestamp} /></div>
    {compact ? <><p className="mt-4 text-sm text-muted-foreground">{Object.values(query.data.services).filter(s => s.status === 'up').length} of {Object.keys(query.data.services).length} dependencies report up.</p><Link href="/platform-health" className="mt-4 inline-block text-sm font-medium text-primary">Inspect service health →</Link></> : <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Object.entries(query.data.services).map(([name, service]) => <Card key={name}><CardHeader className="flex flex-row items-center justify-between gap-2"><CardTitle className="capitalize">{name.replace(/_/g, ' ')}</CardTitle><StatusBadge status={service.status} /></CardHeader><CardContent><dl className="space-y-2 text-sm">
        {([['Latency', service.latency_ms, 'ms'], ['Pending jobs', service.pending_jobs, ''], ['Failed jobs', service.failed_jobs, ''], ['Disk usage', service.disk_usage_percent, '%']] as const).filter(([, value]) => value !== undefined).map(([label, value, unit]) => <div key={label} className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium tabular-nums">{value?.toLocaleString()} {unit}</dd></div>)}
        {service.status === 'down' && <p className="text-status-error">Dependency check failed. Review server monitoring for diagnostics.</p>}
      </dl></CardContent></Card>)}
    </div>}
  </> : null
  if (compact) return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity aria-hidden="true" className="h-4 w-4" />Platform health</CardTitle><CardDescription>Latest API dependency checks</CardDescription></CardHeader><CardContent>{result}</CardContent></Card>
  return <div className="space-y-6"><PageHeader title="Platform health" description="Database, Redis, cache, storage, queue and geocoding readiness." icon={Activity} actions={refresh} /><Card><CardContent className="pt-6">{result}</CardContent></Card><p className="text-xs leading-5 text-muted-foreground">Checks run on refresh; this is a point-in-time readiness snapshot. Queue values reflect the backend probe and are not a complete job history. Timestamps use West Africa Time (UTC+1).</p></div>
}
