import { useQuery } from '@tanstack/react-query'
import { listAuditLogs } from '@/api/audit-logs'
import { DataTable } from '@/components/shared/DataTable'
import { PageError } from '@/components/shared/PageError'
import { Badge } from '@/components/ui/badge'
import { ScrollText, ShieldAlert } from 'lucide-react'
import type { AuditLog } from '@/types'
import type { ColumnDef } from '@tanstack/react-table'

const riskColors: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
}

export default function AuditLogsPage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['audit-logs'],
        queryFn: () => listAuditLogs({ page: 1, per_page: 20 }),
    })

    const columns: ColumnDef<AuditLog, any>[] = [
        { accessorKey: 'created_at', header: 'Timestamp' },
        { accessorKey: 'admin.name', header: 'Admin' },
        { accessorKey: 'action', header: 'Action' },
        { accessorKey: 'path', header: 'Path' },
        {
            accessorKey: 'risk_level',
            header: 'Risk',
            cell: ({ row }) => (
                <Badge className={riskColors[row.original.risk_level] || 'bg-gray-100'}>
                    {row.original.risk_level}
                </Badge>
            )
        },
        {
            accessorKey: 'is_sensitive',
            header: 'Sensitive',
            cell: ({ row }) => row.original.is_sensitive ? <ShieldAlert className="h-4 w-4 text-red-500" /> : null
        }
    ]

    if (isError) return <PageError message="Failed to load audit logs." />

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ScrollText className="h-6 w-6" /> Audit Logs
                </h1>
            </div>
            <DataTable
                columns={columns}
                data={data?.data || []}
                isLoading={isLoading}
            />
        </div>
    )
}
