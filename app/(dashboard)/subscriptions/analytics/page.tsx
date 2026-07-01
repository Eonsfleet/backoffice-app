'use client'

import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, Users, XCircle, Ban, CreditCard,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { PageHeader }  from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton }    from '@/components/ui/skeleton'
import { Badge }       from '@/components/ui/badge'
import {
  getSubscriptionSummary, getSubscriptionStatusDistribution, getMrrAnalytics,
} from '@/features/subscriptions/api'

// ─── Constants ────────────────────────────────────────────────────────────────

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

function fmt(v?: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(v)
}

function fmtCompact(v?: number | null) {
  if (v == null) return '—'
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `₦${(v / 1_000).toFixed(1)}K`
  return `₦${v}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, trend, iconClass = 'bg-primary/10',
}: {
  label:      string
  value:      string | number | undefined
  sub?:       string
  icon:       React.ElementType
  trend?:     'up' | 'down' | 'neutral'
  iconClass?: string
}) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{value ?? '—'}</p>
            {sub && (
              <div className="flex items-center gap-1">
                {trend && <TrendIcon className={`h-3 w-3 ${trendColor}`} />}
                <p className={`text-xs ${trend ? trendColor : 'text-muted-foreground'}`}>{sub}</p>
              </div>
            )}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubscriptionAnalyticsPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['subscription-summary'],
    queryFn:  getSubscriptionSummary,
    staleTime: 60_000,
  })

  const { data: distribution, isLoading: loadingDist } = useQuery({
    queryKey: ['subscription-status-distribution'],
    queryFn:  getSubscriptionStatusDistribution,
    staleTime: 60_000,
  })

  const { data: mrr, isLoading: loadingMrr } = useQuery({
    queryKey: ['subscription-mrr'],
    queryFn:  getMrrAnalytics,
    staleTime: 60_000,
  })

  const chartData = (distribution ?? [])
    .filter((d) => d.count > 0)
    .map((d) => ({
      name:  d.status.charAt(0).toUpperCase() + d.status.slice(1),
      value: d.count,
      color: STATUS_COLORS[d.status] ?? '#94a3b8',
    }))

  const planBarData = (mrr?.mrr_by_plan ?? []).map((p) => ({
    name:  p.plan,
    mrr:   p.mrr,
    subs:  p.subscribers,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Analytics"
        description="MRR, churn, and subscriber breakdown"
        icon={TrendingUp}
      />

      {/* MRR KPIs */}
      {loadingMrr ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Current MRR"
            value={fmtCompact(mrr?.current_mrr)}
            sub={fmt(mrr?.current_mrr)}
            icon={CreditCard}
            iconClass="bg-emerald-500/10"
          />
          <KpiCard
            label="Net MRR Movement"
            value={fmtCompact(mrr?.net_mrr_movement)}
            sub={`+${fmtCompact(mrr?.new_mrr_this_month)} / -${fmtCompact(mrr?.churned_mrr_this_month)}`}
            icon={mrr && mrr.net_mrr_movement >= 0 ? TrendingUp : TrendingDown}
            trend={mrr && mrr.net_mrr_movement >= 0 ? 'up' : 'down'}
            iconClass="bg-blue-500/10"
          />
          <KpiCard
            label="Churn Rate"
            value={mrr?.churn_rate != null ? `${mrr.churn_rate}%` : '—'}
            sub={`${mrr?.cancelled_this_month ?? 0} cancellation${mrr?.cancelled_this_month !== 1 ? 's' : ''} this month`}
            icon={TrendingDown}
            trend={mrr && mrr.churn_rate > 5 ? 'down' : 'neutral'}
            iconClass="bg-red-500/10"
          />
          <KpiCard
            label="Active Subscriptions"
            value={mrr?.active_subscriptions}
            icon={Users}
            iconClass="bg-violet-500/10"
          />
        </div>
      )}

      {/* Subscriber count KPIs */}
      {loadingSummary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total"    value={summary?.total}    icon={CreditCard} />
          <KpiCard label="Active"   value={summary?.active}   icon={Users}      iconClass="bg-emerald-500/10" />
          <KpiCard label="Inactive" value={summary?.inactive} icon={XCircle}    iconClass="bg-yellow-500/10" />
          <KpiCard label="Canceled" value={summary?.canceled} icon={Ban}        iconClass="bg-red-500/10" />
        </div>
      )}

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-5">

        {/* Status distribution donut */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Status Distribution</CardTitle>
            <CardDescription className="text-xs">All statuses including dunning stages</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDist ? (
              <div className="flex justify-center py-10">
                <Skeleton className="h-44 w-44 rounded-full" />
              </div>
            ) : chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, '']} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* MRR by plan bar chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">MRR by Plan</CardTitle>
            <CardDescription className="text-xs">Revenue contribution per subscription plan</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMrr ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full rounded" />)}
              </div>
            ) : planBarData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No plan data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={planBarData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCompact(v)} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [fmt(v as number), 'MRR']}
                    labelFormatter={(l) => `Plan: ${l}`}
                  />
                  <Bar dataKey="mrr" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MRR by plan table */}
      {!loadingMrr && planBarData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Plan Breakdown</CardTitle>
            <CardDescription className="text-xs">Subscribers and MRR per plan</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Subscribers</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">MRR</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(mrr?.mrr_by_plan ?? []).map((p) => {
                  const pct = mrr?.current_mrr ? ((p.mrr / mrr.current_mrr) * 100).toFixed(1) : '—'
                  return (
                    <tr key={p.plan} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-medium text-foreground">{p.plan}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">{p.subscribers}</td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium">{fmt(p.mrr)}</td>
                      <td className="px-6 py-3 text-right">
                        <Badge variant="outline" className="text-[10px] font-normal">{pct}%</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-border bg-muted/20">
                <tr>
                  <td className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Total</td>
                  <td className="px-6 py-3 text-right tabular-nums font-semibold">{mrr?.active_subscriptions}</td>
                  <td className="px-6 py-3 text-right tabular-nums font-semibold">{fmt(mrr?.current_mrr)}</td>
                  <td className="px-6 py-3 text-right">
                    <Badge variant="secondary" className="text-[10px]">100%</Badge>
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
