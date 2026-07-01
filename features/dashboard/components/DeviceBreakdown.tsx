'use client'

import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardDevices } from '@/features/dashboard/api'

const COLORS: Record<string, string> = {
  online:     '#10b981',
  offline:    '#6b7280',
  unassigned: '#3b82f6',
}

const LABELS: Record<string, string> = {
  online:     'Online',
  offline:    'Offline',
  unassigned: 'Unassigned',
}

type DeviceData = {
  online?: number
  offline?: number
  unassigned?: number
  [key: string]: number | undefined
}

export function DeviceBreakdown() {
  const { data, isLoading } = useQuery<DeviceData>({
    queryKey: ['dashboard-devices'],
    queryFn: getDashboardDevices,
    staleTime: 60_000,
  })

  const chartData = data
    ? Object.entries(data)
        .filter(([, v]) => typeof v === 'number')
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
        <CardDescription>Breakdown of all registered devices</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="mx-auto h-40 w-40 rounded-full" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">No device data available</p>
        ) : (
          <div>
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
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {total} total devices
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
