'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BarChart3,
  CheckCircle2,
  CreditCard,
  FileText,
  Layers,
  Receipt,
  RefreshCw,
  Route,
  ServerCog,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SubscriptionWorkspace } from '@/features/subscriptions/components/SubscriptionWorkspace'
import {
  getMrrAnalytics,
  getSubscriptionStatusDistribution,
  getSubscriptionSummary,
  listSubscribers,
} from '@/features/subscriptions/api'

const STATUS_COLORS: Record<string, string> = {
  active: '#16a34a',
  trial: '#2563eb',
  grace: '#d97706',
  restricted: '#ea580c',
  suspended: '#dc2626',
  expired: '#64748b',
  inactive: '#94a3b8',
  canceled: '#991b1b',
}

const QUICK_ACTIONS = [
  { label: 'Plan Catalog', href: '/subscriptions/plans', icon: Layers, description: 'Visibility, features, pricing' },
  { label: 'Subscriber Ops', href: '/subscriptions/subscribers', icon: Users, description: 'POC, production, renewals' },
  { label: 'Transactions', href: '/subscriptions/transactions', icon: Receipt, description: 'Payment trail and exports' },
  { label: 'Invoices', href: '/subscriptions/invoices', icon: FileText, description: 'Documents and status' },
]

const ADMIN_API_LANES = [
  { label: 'Catalog', href: '/subscriptions/plans', icon: Layers, tone: 'text-blue-600', items: ['public plans', 'hidden plans', 'feature units'] },
  { label: 'Lifecycle', href: '/subscriptions/subscribers', icon: Route, tone: 'text-emerald-600', items: ['POC', 'production', 'scheduled change'] },
  { label: 'Recovery', href: '/subscriptions/subscribers', icon: RefreshCw, tone: 'text-amber-700', items: ['payment state', 'billing groups', 'renewal retry'] },
  { label: 'Finance', href: '/subscriptions/transactions', icon: ShieldCheck, tone: 'text-violet-600', items: ['transactions', 'invoices', 'exports'] },
]

function money(value?: number | null) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)
}

function compactMoney(value?: number | null) {
  if (value == null) return '—'
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(1)}K`
  return `₦${value}`
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'primary',
  loading,
}: {
  label: string
  value?: string | number
  detail?: string
  icon: React.ElementType
  tone?: 'primary' | 'green' | 'amber' | 'red' | 'blue'
  loading?: boolean
}) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-700',
    red: 'bg-red-500/10 text-red-600',
    blue: 'bg-blue-500/10 text-blue-600',
  }

  return (
    <Card>
      <CardContent className="pt-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
              <p className="truncate text-2xl font-bold tracking-tight text-foreground">{value ?? '—'}</p>
              {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SubscriptionsOverviewPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['subscription-summary'],
    queryFn: getSubscriptionSummary,
    staleTime: 60_000,
  })

  const { data: distribution, isLoading: loadingDist } = useQuery({
    queryKey: ['subscription-status-distribution'],
    queryFn: getSubscriptionStatusDistribution,
    staleTime: 60_000,
  })

  const { data: mrr, isLoading: loadingMrr } = useQuery({
    queryKey: ['subscription-mrr'],
    queryFn: getMrrAnalytics,
    staleTime: 60_000,
  })

  const { data: recentData, isLoading: loadingRecent } = useQuery({
    queryKey: ['subscribers', { page: 1, per_page: 7 }],
    queryFn: () => listSubscribers({ page: 1, per_page: 7 }),
    staleTime: 30_000,
  })

  const chartData = (distribution ?? [])
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: item.status,
      value: item.count,
      color: STATUS_COLORS[item.status] ?? '#94a3b8',
    }))

  const attentionCount = (distribution ?? [])
    .filter((item) => ['grace', 'restricted', 'suspended', 'expired', 'canceled'].includes(item.status))
    .reduce((sum, item) => sum + item.count, 0)

  const activeTotal = summary?.active ?? mrr?.active_subscriptions ?? 0
  const recent = recentData?.data ?? []

  return (
    <SubscriptionWorkspace
      title="Billing Command Center"
      description="A structured view of subscription revenue, renewal health, payment attention, and the admin flows that keep billing moving."
      actions={
        <>
          <Button variant="outline" asChild>
            <Link href="/subscriptions/analytics">
              <BarChart3 className="mr-2 h-4 w-4" /> Analytics
            </Link>
          </Button>
          <Button asChild>
            <Link href="/subscriptions/plans">
              <Layers className="mr-2 h-4 w-4" /> Plans
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Current MRR"
          value={compactMoney(mrr?.current_mrr)}
          detail={money(mrr?.current_mrr)}
          icon={CreditCard}
          tone="green"
          loading={loadingMrr}
        />
        <MetricTile
          label="Active Subscribers"
          value={activeTotal}
          detail={`${summary?.total ?? 0} total subscriptions`}
          icon={Users}
          tone="blue"
          loading={loadingSummary || loadingMrr}
        />
        <MetricTile
          label="Net MRR Movement"
          value={compactMoney(mrr?.net_mrr_movement)}
          detail={`New ${compactMoney(mrr?.new_mrr_this_month)} · churned ${compactMoney(mrr?.churned_mrr_this_month)}`}
          icon={mrr && mrr.net_mrr_movement < 0 ? Ban : CheckCircle2}
          tone={mrr && mrr.net_mrr_movement < 0 ? 'red' : 'green'}
          loading={loadingMrr}
        />
        <MetricTile
          label="Needs Attention"
          value={attentionCount}
          detail="Grace, restricted, suspended or expired"
          icon={AlertTriangle}
          tone={attentionCount > 0 ? 'amber' : 'green'}
          loading={loadingDist}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ServerCog className="h-4 w-4 text-primary" />
                Admin Billing API
              </CardTitle>
              <CardDescription>Catalog, lifecycle, recovery, and finance operations</CardDescription>
            </div>
            <StatusBadge status={attentionCount > 0 ? 'pending' : 'active'} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-0 p-0 sm:grid-cols-2 xl:grid-cols-4">
          {ADMIN_API_LANES.map(({ label, href, icon: Icon, tone, items }) => (
            <Link
              key={label}
              href={href}
              className="group border-b p-4 transition-colors hover:bg-muted/30 sm:odd:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${tone}`} />
                  <p className="text-sm font-semibold">{label}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <span key={item} className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                    {item}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Subscription Health</CardTitle>
            <CardDescription>Status mix across all organizations</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDist ? (
              <div className="flex justify-center py-8">
                <Skeleton className="h-44 w-44 rounded-full" />
              </div>
            ) : chartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No status data yet</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-[180px_1fr] xl:grid-cols-1 2xl:grid-cols-[180px_1fr]">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={chartData} innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                      {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Subscriptions']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {chartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="capitalize text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Plan Revenue</CardTitle>
            <CardDescription>Top plans by monthly recurring revenue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingMrr ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)
            ) : (mrr?.mrr_by_plan ?? []).length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No plan revenue yet</p>
            ) : (
              (mrr?.mrr_by_plan ?? []).slice(0, 5).map((plan) => {
                const pct = mrr?.current_mrr ? Math.round((plan.mrr / mrr.current_mrr) * 100) : 0
                return (
                  <div key={plan.plan} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{plan.plan}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{compactMoney(plan.mrr)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, pct)}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{plan.subscribers} subscribers</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Subscribers</CardTitle>
              <CardDescription>Latest organizations on subscription records</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/subscriptions/subscribers">
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingRecent ? (
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 px-6 py-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No subscriber activity yet</p>
            ) : (
              <ul className="divide-y">
                {recent.map((sub) => (
                  <li key={sub.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary uppercase">
                      {sub.organization?.name?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{sub.organization?.name ?? 'Unknown organization'}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.plan?.name ?? 'No plan'} · {sub.billing_cycle ?? '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={sub.status} />
                      <span className="text-[11px] text-muted-foreground">
                        {sub.started_at ? format(new Date(sub.started_at), 'MMM d') : '—'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_ACTIONS.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operational Rhythm</CardTitle>
          <CardDescription>Recommended admin checks for this billing cycle</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <RefreshCw className="mb-3 h-5 w-5 text-amber-600" />
            <p className="text-sm font-medium">Recover failed renewals</p>
            <p className="mt-1 text-xs text-muted-foreground">Review grace and restricted accounts before they become suspended.</p>
          </div>
          <div className="rounded-lg border p-4">
            <Layers className="mb-3 h-5 w-5 text-blue-600" />
            <p className="text-sm font-medium">Keep plans current</p>
            <p className="mt-1 text-xs text-muted-foreground">Check active plans, included features, and add-on pricing before new sales.</p>
          </div>
          <div className="rounded-lg border p-4">
            <Receipt className="mb-3 h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium">Export payment records</p>
            <p className="mt-1 text-xs text-muted-foreground">Use transaction exports for finance reconciliation and audit trails.</p>
          </div>
        </CardContent>
      </Card>
    </SubscriptionWorkspace>
  )
}
