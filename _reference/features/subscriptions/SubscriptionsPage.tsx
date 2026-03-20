import { useQuery } from '@tanstack/react-query'
import { listSubscriptions } from '@/api/subscriptions'
import { DataTable } from '@/components/shared/DataTable'
import { PageError } from '@/components/shared/PageError'
import { Badge } from '@/components/ui/badge'
import type { Subscription } from '@/types'
import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import type { ColumnDef } from '@tanstack/react-table'

const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    trial: 'bg-blue-100 text-blue-800',
    grace: 'bg-yellow-100 text-yellow-800',
    restricted: 'bg-orange-100 text-orange-800',
    suspended: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
}

export default function SubscriptionsPage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['subscriptions'],
        queryFn: () => listSubscriptions({ page: 1, per_page: 20 }),
    })

    const columns: ColumnDef<Subscription, any>[] = [
        { accessorKey: 'organization.name', header: 'Organization' },
        { accessorKey: 'plan.name', header: 'Plan' },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status
                return <Badge className={statusColors[status] || 'bg-gray-100'}>{status}</Badge>
            }
        },
        { accessorKey: 'vehicle_count', header: 'Vehicles' },
        { accessorKey: 'started_at', header: 'Start Date' }
    ]

    if (isError) return <PageError message="Failed to load subscriptions." />

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Subscriptions</h1>
                <Can permission="manage_subscriptions">
                    <Link to="/subscriptions/plans">
                        <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Manage Plans</Button>
                    </Link>
                </Can>
            </div>
            <DataTable
                columns={columns}
                data={data?.data || []}
                isLoading={isLoading}
            />
        </div>
    )
}
