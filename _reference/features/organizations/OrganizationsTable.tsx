import { DataTable } from '@/components/shared/DataTable'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { Organization } from '@/types'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

interface OrganizationsTableProps {
    data: Organization[]
    isLoading: boolean
    onDelete: (id: number) => void
}

export function OrganizationsTable({ data, isLoading, onDelete }: OrganizationsTableProps) {
    const columns: ColumnDef<Organization, any>[] = [
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'identifier', header: 'Identifier' },
        { accessorKey: 'subdomain', header: 'Subdomain' },
        {
            accessorKey: 'joined_date',
            header: 'Created At',
            cell: ({ row }) => {
                console.log(row.original)
                try {
                    return format(new Date(row.original.joined_date), 'MMM dd, yyyy')
                } catch {
                    return row.original.joined_date
                }
            }
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-right">
                    <Link to={`/organizations/${row.original.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                    </Link>
                    <Can permission="manage_organizations">
                        <Button variant="ghost" size="sm" onClick={() => onDelete(row.original.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </Can>
                </div>
            )
        }
    ]

    return (
        <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
        />
    )
}
