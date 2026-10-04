'use client'

import { useUrlListState } from '@/hooks/useUrlListState'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'

import { DataTable } from '@/components/shared/DataTable'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { listReconciliationMismatches } from '@/features/subscriptions/api'
import { BillingWorkspace } from '@/features/billing/components/BillingWorkspace'
import type { ReconciliationMismatch } from '@/types/api'

const STATUS_OPTIONS = [
  { value: 'all',      label: 'All Statuses' },
  { value: 'open',     label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
]

function fmtMinor(v: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(v / 100)
}

const PER_PAGE = 25

function ReconciliationTable() {
  const { status, page, setStatus, setPage } = useUrlListState()

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['reconciliation-mismatches', { status, page }],
    queryFn: () => listReconciliationMismatches({ status: status !== 'all' ? status : undefined, page }),
    staleTime: 30_000,
  })

  const columns: ColumnDef<ReconciliationMismatch, unknown>[] = [
    {
      id: 'provider',
      header: 'Provider',
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.provider}</span>,
    },
    {
      id: 'kind',
      header: 'Kind',
      cell: ({ row }) => <Badge variant="secondary" className="text-xs capitalize">{row.original.kind}</Badge>,
    },
    {
      id: 'expected',
      header: 'Expected',
      cell: ({ row }) => <span className="text-sm tabular-nums">{fmtMinor(row.original.expected_minor)}</span>,
    },
    {
      id: 'actual',
      header: 'Actual',
      cell: ({ row }) => <span className="text-sm tabular-nums">{fmtMinor(row.original.actual_minor)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'open' ? 'destructive' : 'outline'} className="text-xs capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'created_at',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{format(new Date(row.original.created_at), 'MMM d, yyyy')}</span>
      ),
    },
  ]

  const toolbar = (
    <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
      <SelectTrigger aria-label="Reconciliation status" className="w-full sm:w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )

  return (
    <DataTable
      data={data?.data ?? []}
      columns={columns}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={() => void refetch()}
      toolbar={toolbar}
      pagination={{ pageIndex: page - 1, pageSize: PER_PAGE }}
      pageCount={data?.meta?.last_page ?? 1}
      onPaginationChange={(s) => setPage(s.pageIndex + 1)}
    />
  )
}

export default function ReconciliationPage() {
  return (
    <BillingWorkspace
      title="Reconciliation"
      description="Provider settlement mismatches flagged for finance review."
    >
      <PermissionGate
        permission="admin.billing.money"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <AlertTriangle className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">You don&apos;t have permission to view reconciliation data.</p>
          </div>
        }
      >
        <ReconciliationTable />
      </PermissionGate>
    </BillingWorkspace>
  )
}
