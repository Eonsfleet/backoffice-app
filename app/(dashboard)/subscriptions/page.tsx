'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  CreditCard, Users, XCircle, Ban,
  Layers, Receipt, FileText, ChevronRight,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

import { PageHeader }  from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { KpiCard }     from '@/components/shared/KpiCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton }    from '@/components/ui/skeleton'
import { Button }      from '@/components/ui/button'

import {
  getSubscriptionSummary, getSubscriptionStatusDistribution, listSubscribers,
} from '@/features/subscriptions/api'

const STATUS_COLORS: Record<string, string> = {
  active:     '#10b981',
  trial:      '#3b82f6',
  grace:      '#f59e0b',
  restricted: '#f97316',
  suspended:  '#ef4444',
  expired:    '#6b7280',
  inactive:   '#94a3b8',
  canceled:   '#dc2626',
}

const QUICK_LINKS = [
  { label: 'Plans',        href: '/subscriptions/plans',        icon: Layers,   desc: 'Manage pricing tiers' },
  { label: 'Subscribers',  href: '/subscriptions/subscribers',  icon: Users,    desc: 'All active subscriptions' },
  { label: 'Transactions', href: '/subscriptions/transactions', icon: Receipt,  desc: 'Payment history' },
  { label: 'Invoices',     href: '/subscriptions/invoices',     icon: FileText, desc: 'Download invoices' },
]

export default function SubscriptionsOverviewPage() {
  const router = useRouter()

  const { data: summary, isLoading: loadingKpi } = useQuery({
    queryKey: ['subscription-summary'],
    queryFn:  getSubscriptionSummary,
    staleTime: 60_000,
  })

  const { data: distribution, isLoading: loadingDist } = useQuery({
    queryKey: ['subscription-status-distribution'],
    queryFn:  getSubscriptionStatusDistribution,
    staleTime: 60_000,
  })

  const { data: recentData, isLoading: loadingRecent } = useQuery({
    queryKey: ['subscribers', { page: 1, per_page: 6 }],
    queryFn:  () => listSubscribers({ page: 1, per_page: 6 }),
    staleTime: 30_000,
  })

  const chartData = (distribution ?? [])
    .filter((d) => d.count > 0)
    .map((d) => ({
      name:  d.status.charAt(0).toUpperCase() + d.status.slice(1),
      value: d.count,
      color: STATUS_COLORS[d.status] ?? '#94a3b8',
    }))

  const recent = recentData?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Revenue, subscribers, and billing overview"
        icon={CreditCard}
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total"    value={summary?.total}    icon={CreditCard} isLoading={loadingKpi} iconClassName="bg-primary/10" />
        <KpiCard label="Active"   value={summary?.active}   icon={Users}      isLoading={loadingKpi} iconClassName="bg-emerald-500/10" />
        <KpiCard label="Inactive" value={summary?.inactive} icon={XCircle}    isLoading={loadingKpi} iconClassName="bg-yellow-500/10" />
        <KpiCard label="Canceled" value={summary?.canceled} icon={Ban}        isLoading={loadingKpi} iconClassName="bg-red-500/10" />
      </div>

      {/* Quick nav */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map(({ label, href, icon: Icon, desc }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/40 hover:border-primary/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
          </button>
        ))}
      </div>

      {/* Chart + Recent */}
      <div className="grid gap-4 lg:grid-cols-5">

        {/* Status distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Status Distribution</CardTitle>
            <CardDescription className="text-xs">Subscriptions by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDist ? (
              <div className="flex justify-center py-8">
                <Skeleton className="h-44 w-44 rounded-full" />
              </div>
            ) : chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, '']} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent subscribers */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Subscribers</CardTitle>
              <CardDescription className="text-xs">Latest subscription activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push('/subscriptions/subscribers')}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingRecent ? (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3 border-b last:border-0">
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-2.5 w-32" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No subscribers yet</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((sub) => (
                  <li key={sub.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary uppercase">
                      {sub.organization?.name?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{sub.organization?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.plan?.name} · {sub.billing_cycle ?? '—'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={sub.status} />
                      {sub.started_at && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(sub.started_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
