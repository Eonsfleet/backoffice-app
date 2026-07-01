'use client'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  getSortedRowModel,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Settings2 } from 'lucide-react'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuCheckboxItem,
  DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T, unknown>[]
  pagination?: PaginationState
  pageCount?: number
  onPaginationChange?: (state: PaginationState) => void
  isLoading?: boolean
  /** True while a background refetch is in progress (filter/page change). Shows a progress bar. */
  isFetching?: boolean
  skeletonRows?: number
  toolbar?: React.ReactNode
}

export function DataTable<T>({
  data,
  columns,
  pagination,
  pageCount,
  onPaginationChange,
  isLoading,
  isFetching,
  skeletonRows = 8,
  toolbar,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination, sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      if (onPaginationChange && pagination) {
        const next = typeof updater === 'function' ? updater(pagination) : updater
        onPaginationChange(next)
      }
    },
  })

  return (
    <div className="space-y-3">
      {/* Toolbar slot + column visibility toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">{toolbar}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              <Settings2 className="mr-2 h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  className="capitalize"
                  checked={col.getIsVisible()}
                  onCheckedChange={(val) => col.toggleVisibility(val)}
                >
                  {col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-card">
        {/* Refetch progress bar — shown while background data refresh is in flight */}
        {isFetching && !isLoading && (
          <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-primary/20 overflow-hidden">
            <div className="h-full w-1/3 animate-pulse bg-primary rounded-full" />
          </div>
        )}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    className={cn('text-xs font-semibold uppercase tracking-wide text-muted-foreground', h.column.getCanSort() && 'cursor-pointer select-none')}
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getCanSort() && (
                        h.column.getIsSorted() === 'asc' ? <ChevronUp className="h-3 w-3" />
                        : h.column.getIsSorted() === 'desc' ? <ChevronDown className="h-3 w-3" />
                        : <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-16 text-center text-sm text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="transition-colors hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && onPaginationChange && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.pageIndex + 1} of {pageCount ?? '?'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              disabled={pagination.pageIndex === 0}
              onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={pagination.pageIndex + 1 >= (pageCount ?? 1)}
              onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
