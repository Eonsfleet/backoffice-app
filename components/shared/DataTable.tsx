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
import { QueryError } from '@/components/shared/QueryError'

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
  error?: unknown
  onRetry?: () => void
  emptyMessage?: string
  caption?: string
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
  error,
  onRetry,
  emptyMessage = 'No records match your filters. Try changing your search or clearing the filters.',
  caption = 'Records',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact')

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns APIs React Compiler cannot memoize safely.
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">{toolbar}</div>
        <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" aria-pressed={density === 'comfortable'} onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}>
          {density === 'compact' ? 'Compact rows' : 'Comfortable rows'}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto">
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
                  disabled={col.getIsVisible() && table.getVisibleLeafColumns().length === 1}
                  onCheckedChange={(val) => col.toggleVisibility(val)}
                >
                  {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id.replace(/_/g, ' ')}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {sorting.length > 0 && <p role="status" className="text-xs text-muted-foreground">Sorted within this page of results.</p>}

      {/* Table */}
      {error ? <QueryError error={error} retry={onRetry} label="these records" /> : <div aria-busy={!!(isLoading || isFetching)} className="relative rounded-lg border border-border bg-card [&_[data-slot=table-container]]:max-h-[65vh] [&_[data-slot=table-container]]:overflow-auto [&_[data-slot=table-container]]:overscroll-contain">
        {/* Refetch progress bar — shown while background data refresh is in flight */}
        {isFetching && !isLoading && (
          <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-primary/20 overflow-hidden">
            <div className="h-full w-1/3 animate-pulse bg-primary rounded-full" />
          </div>
        )}
        <Table className="min-w-max">
          <caption className="sr-only">{caption}</caption>
          <TableHeader className="sticky top-0 z-[1] bg-card">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    scope="col"
                    aria-sort={h.column.getCanSort() ? (h.column.getIsSorted() === 'asc' ? 'ascending' : h.column.getIsSorted() === 'desc' ? 'descending' : 'none') : undefined}
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    {h.isPlaceholder ? null : h.column.getCanSort() ? <button type="button" onClick={h.column.getToggleSortingHandler()} className="flex min-h-10 items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === 'asc' ? <ChevronUp aria-hidden="true" className="h-3 w-3" /> : h.column.getIsSorted() === 'desc' ? <ChevronDown aria-hidden="true" className="h-3 w-3" /> : <ChevronsUpDown aria-hidden="true" className="h-3 w-3 opacity-40" />}
                    </button> : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i}>
                  {table.getVisibleLeafColumns().map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(1, table.getVisibleLeafColumns().length)} className="py-16 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="transition-colors hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn('text-sm', density === 'comfortable' ? 'py-4' : 'py-2', typeof cell.getValue() === 'number' && 'text-right tabular-nums')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>}

      {/* Pagination */}
      {!error && pagination && onPaginationChange && (
        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {pagination.pageIndex + 1} of {Math.max(1, pageCount ?? 1)}
          </span>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
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
