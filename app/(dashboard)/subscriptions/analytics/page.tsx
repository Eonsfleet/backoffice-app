'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Users, XCircle, Ban, CreditCard } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getSubscriptionSummary, getSubscriptionStatusDistribution } from '@/features/subscriptions/api'

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

function MetricCard({ label, value, icon: Icon }: {
  label: string
  value?: string | number
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value ?? '—'}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

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

  const chartData = (distribution ?? []).map((d) => ({
    name:  d.status.charAt(0).toUpperCase() + d.status.slice(1),
    value: d.count,
    color: STATUS_COLORS[d.status] ?? '#94a3b8',
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Analytics"
        description="Subscriber counts and status distribution"
        icon={TrendingUp}
      />

      {loadingSummary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total"    value={summary?.total}    icon={CreditCard} />
          <MetricCard label="Active"   value={summary?.active}   icon={Users} />
          <MetricCard label="Inactive" value={summary?.inactive} icon={XCircle} />
          <MetricCard label="Canceled" value={summary?.canceled} icon={Ban} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Distribution</CardTitle>
          <CardDescription>All subscription statuses including dunning stages</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDist ? (
            <div className="flex justify-center py-10">
              <Skeleton className="h-48 w-48 rounded-full" />
            </div>
          ) : chartData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No distribution data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={3} dataKey="value">
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v ?? 0, '']} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
