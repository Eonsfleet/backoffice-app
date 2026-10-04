'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, Layers, Users } from 'lucide-react'
import { SubscriptionWorkspace } from '@/features/subscriptions/components/SubscriptionWorkspace'
import { getSubscriptionSummary, getSubscriptionStatusDistribution, listSubscribers } from '@/features/subscriptions/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/shared/KpiCard'
import { QueryError } from '@/components/shared/QueryError'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'

export default function SubscriptionsOverviewPage() {
  const summary = useQuery({ queryKey: ['subscription-summary'], queryFn: getSubscriptionSummary, staleTime: 60_000 })
  const distribution = useQuery({ queryKey: ['subscription-status-distribution'], queryFn: getSubscriptionStatusDistribution, staleTime: 60_000 })
  const recent = useQuery({ queryKey: ['subscribers', { page: 1, per_page: 5 }], queryFn: () => listSubscribers({ page: 1, per_page: 5 }), staleTime: 30_000 })
  const attention = distribution.data?.filter(item => ['grace', 'restricted', 'suspended', 'expired', 'canceled', 'cancelled'].includes(item.status)).reduce((total, item) => total + item.count, 0)
  return <SubscriptionWorkspace title="Subscription overview" description="Manage subscriber accounts, POC evaluations, production plans, and lifecycle changes." actions={<Button asChild><Link href="/subscriptions/subscribers">Manage subscribers<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}>
    {summary.error && <QueryError error={summary.error} retry={() => void summary.refetch()} label="subscription totals" />}
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiCard label="Total subscriptions" value={summary.data?.total} isLoading={summary.isLoading} icon={Layers} href="/subscriptions/subscribers" />
      <KpiCard label="Active subscriptions" value={summary.data?.active} isLoading={summary.isLoading} icon={Users} href="/subscriptions/subscribers?status=active" />
      <KpiCard label="Lifecycle attention" value={attention} isLoading={distribution.isLoading} icon={AlertTriangle} href="/subscriptions/subscribers" />
    </div>
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-base">Subscription health</CardTitle><p className="text-sm text-muted-foreground">Review account states before changing a plan or evaluation period.</p></CardHeader><CardContent>
        {distribution.error ? <QueryError error={distribution.error} retry={() => void distribution.refetch()} label="subscription health" /> : distribution.isLoading ? <Skeleton className="h-40" /> : !distribution.data?.length ? <p className="text-sm text-muted-foreground">No subscription status data available.</p> : <ul className="divide-y">{distribution.data.map(item => <li key={item.status}><Link href={`/subscriptions/subscribers?status=${encodeURIComponent(item.status)}`} className="flex min-h-12 items-center justify-between gap-3 py-3 hover:text-primary"><StatusBadge status={item.status} /><span className="font-semibold tabular-nums">{item.count}</span></Link></li>)}</ul>}
      </CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle className="text-base">Subscriber accounts</CardTitle><Button variant="ghost" size="sm" asChild><Link href="/subscriptions/subscribers">View all</Link></Button></CardHeader><CardContent>
        {recent.error ? <QueryError error={recent.error} retry={() => void recent.refetch()} label="subscriber accounts" /> : recent.isLoading ? <Skeleton className="h-40" /> : !recent.data?.data.length ? <p className="text-sm text-muted-foreground">No subscriber accounts yet.</p> : <ul className="divide-y">{recent.data.data.map(sub => <li key={sub.id}><Link href={`/subscriptions/subscribers?q=${encodeURIComponent(sub.organization.name)}`} className="flex min-h-16 items-center justify-between gap-3 py-3 hover:text-primary"><div className="min-w-0"><p className="truncate text-sm font-medium">{sub.organization.name}</p><p className="truncate text-xs text-muted-foreground">{sub.plan.name} · {sub.subscription_type ?? 'Type unavailable'}</p></div><StatusBadge status={sub.status} /></Link></li>)}</ul>}
      </CardContent></Card>
    </div>
  </SubscriptionWorkspace>
}
