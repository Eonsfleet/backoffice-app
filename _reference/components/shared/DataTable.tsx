import {
    useReactTable, getCoreRowModel, flexRender,
    type ColumnDef, type PaginationState,
} from '@tanstack/react-table'
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DataTableProps<T> {
    data: T[]
    columns: ColumnDef<T, any>[]
    pagination?: PaginationState
    pageCount?: number
    onPaginationChange?: (updater: PaginationState) => void
    isLoading?: boolean
}

export function DataTable<T>({
    data, columns, pagination, pageCount,
    onPaginationChange, isLoading,
}: DataTableProps<T>) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount,
        state: { pagination },
        onPaginationChange: (updater) => {
            if (onPaginationChange && pagination) {
                const next = typeof updater === 'function' ? updater(pagination) : updater
                onPaginationChange(next)
            }
        },
    })

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow key={hg.id}>
                                {hg.headers.map((h) => (
                                    <TableHead key={h.id}>
                                        {flexRender(h.column.columnDef.header, h.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="text-center py-10 text-gray-400">
                                    Loading…
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="text-center py-10 text-gray-400">
                                    No records found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            {pagination && onPaginationChange && (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Page {pagination.pageIndex + 1} of {pageCount ?? '?'}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline" size="sm"
                            disabled={pagination.pageIndex === 0}
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex - 1 })}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline" size="sm"
                            disabled={pagination.pageIndex + 1 === pageCount}
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex + 1 })}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
