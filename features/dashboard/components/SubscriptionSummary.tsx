'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getSubscriptionMetrics } from '@/features/dashboard/api'
import { CheckCircle2, XCircle, LayoutList } from 'lucide-react'

export function SubscriptionSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-subscription-metrics'],
    queryFn: getSubscriptionMetrics,
    staleTime: 60_000,
  })

  const metrics = [
    {
      label: 'Total Subscriptions',
      value: data?.total_subscriptions,
      icon: LayoutList,
      color: 'text-foreground',
      bg: 'bg-muted',
    },
    {
      label: 'Active',
      value: data?.active_subscriptions,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Expired',
      value: data?.expired_subscriptions,
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Subscription Overview</CardTitle>
        <CardDescription>Current subscription status across all organizations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {metrics.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
              )}
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
