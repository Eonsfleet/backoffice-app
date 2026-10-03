'use client'

import { QueryError } from '@/components/shared/QueryError'

import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardDevices } from '@/features/dashboard/api'

const COLORS: Record<string, string> = {
  online:     'var(--status-success)',
  offline:    'var(--status-error)',
}

const LABELS: Record<string, string> = {
  online:     'Online',
  offline:    'Offline',
}

type DeviceData = {
  online?: number
  offline?: number
  unassigned?: number
  [key: string]: number | undefined
}

export function DeviceBreakdown() {
  const { data, isLoading, error, refetch } = useQuery<DeviceData>({
    queryKey: ['dashboard-devices'],
    queryFn: getDashboardDevices,
    staleTime: 60_000,
  })

  if (error) return <QueryError error={error} retry={() => void refetch()} />

  const chartData = data
    ? Object.entries(data)
        // Assignment and connectivity overlap; only connectivity belongs in this total.
        .filter(([key, v]) => (key === 'online' || key === 'offline') && typeof v === 'number')
        .map(([key, value]) => ({
          name: LABELS[key] ?? key,
          value: value as number,
          color: COLORS[key] ?? '#94a3b8',
        }))
    : []

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Device Status</CardTitle>
        <CardDescription>Reported online and offline device counts</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="mx-auto h-40 w-40 rounded-full" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
          </div>
        ) : total === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">No device data available</p>
        ) : (
          <div>
            <div aria-hidden="true">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    const v = (value ?? 0) as number
                    return [`${v} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`, '']
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            </div>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {total.toLocaleString()} devices in returned connectivity counts
            </p>
          </div>
        )}
        {!isLoading && <dl className="mt-4 space-y-2 border-t pt-3 text-sm">{(['online', 'offline'] as const).map(key => <div key={key} className="flex justify-between gap-3"><dt>{LABELS[key]}</dt><dd className="font-medium tabular-nums">{data?.[key]?.toLocaleString() ?? 'Unavailable'}</dd></div>)}</dl>}
      </CardContent>
    </Card>
  )
}
