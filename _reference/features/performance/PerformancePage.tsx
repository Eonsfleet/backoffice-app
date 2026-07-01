import { useQueries } from '@tanstack/react-query'
import { getPerformanceMetrics, getDatabaseStats } from '@/api/performance'
import { PageError } from '@/components/shared/PageError'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-react'

export default function PerformancePage() {
    const [metrics, dbStats] = useQueries({
        queries: [
            { queryKey: ['performance-metrics'], queryFn: getPerformanceMetrics },
            { queryKey: ['db-stats'], queryFn: getDatabaseStats },
        ],
    })

    if (metrics.isError || dbStats.isError) {
        return <PageError message="Failed to load performance data." />
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Activity className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Platform Performance</h1>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Response Times</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500">
                            Metrics visualizer placeholder for API response times.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Database Stats</CardTitle></CardHeader>
                    <CardContent>
                        <pre className="text-xs text-gray-700 bg-gray-50 p-4 rounded mt-2 overflow-x-auto">
                            {JSON.stringify(dbStats.data || {}, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
