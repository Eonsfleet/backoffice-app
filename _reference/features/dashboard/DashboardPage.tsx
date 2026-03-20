import { useQueries } from '@tanstack/react-query'
import {
    getDashboardMetrics, getSubscriptionMetrics,
    getDeviceMetrics, getOrgPerformance, getDashboardOrganizations,
} from '@/api/dashboard'
import { StatCard } from '@/components/shared/StatCard'
import { PageError } from '@/components/shared/PageError'
import { Building2, Car, CreditCard, Cpu } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
    const [metrics, subscriptions, _devices, performance, _orgs] = useQueries({
        queries: [
            { queryKey: ['dashboard-metrics'], queryFn: getDashboardMetrics },
            { queryKey: ['subscription-metrics'], queryFn: getSubscriptionMetrics },
            { queryKey: ['device-metrics'], queryFn: getDeviceMetrics },
            { queryKey: ['org-performance'], queryFn: getOrgPerformance },
            { queryKey: ['dashboard-orgs'], queryFn: getDashboardOrganizations },
        ],
    })

    if (metrics.isError || subscriptions.isError || performance.isError) {
        return <PageError message="Failed to load dashboard metrics." />
    }

    const m = metrics.data

    // Safely parse subscriptions data into an array if it's an object instead of array
    const rawSubData = subscriptions.data || []
    const subData = Array.isArray(rawSubData)
        ? rawSubData
        : Object.entries(rawSubData).map(([status, count]) => ({ status, count }))

    // Safely parse performance data
    const rawPerfData = performance.data || []
    const perfData = Array.isArray(rawPerfData)
        ? rawPerfData
        : Object.entries(rawPerfData).map(([name, data]: any) => ({ name, ...data }))

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Organizations" value={m?.total_organizations} icon={Building2} />
                <StatCard label="Vehicles" value={m?.total_vehicles} icon={Car} />
                <StatCard label="Active Subscriptions" value={m?.active_subscriptions} icon={CreditCard} />
                <StatCard label="Devices" value={m?.total_devices} icon={Cpu} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Subscription status donut */}
                <Card>
                    <CardHeader><CardTitle>Subscription Status</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={subData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80}>
                                    {subData.map((_: any, i: number) => (
                                        <Cell key={i} fill={['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444', '#9ca3af'][i % 6]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Org performance bar chart */}
                <Card>
                    <CardHeader><CardTitle>Top Organizations</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={perfData}>
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="vehicle_count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
