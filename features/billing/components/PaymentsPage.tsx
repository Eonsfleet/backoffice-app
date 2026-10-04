'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Download, CheckCircle2, XCircle, Clock } from 'lucide-react'

import { DataTable }   from '@/components/shared/DataTable'
import { Button }      from '@/components/ui/button'
import { FilterBar } from '@/components/shared/FilterBar'
import { Badge }       from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { listTransactions, exportTransactions } from '@/features/subscriptions/api'
import { BillingWorkspace } from '@/features/billing/components/BillingWorkspace'
import type { Transaction } from '@/types/api'
import { useUrlListState } from '@/hooks/useUrlListState'
import { useDebounce } from '@/hooks/useDebounce'

const STATUS_OPTIONS = [
  { value: 'all',        label: 'All Statuses' },
  { value: 'successful', label: 'Successful' },
  { value: 'failed',     label: 'Failed' },
  { value: 'pending',    label: 'Pending' },
]

const GATEWAY_OPTIONS = [
  { value: 'all',       label: 'All Gateways' },
  { value: 'paystack',  label: 'Paystack' },
  { value: 'manual',    label: 'Manual' },
]

function TransactionStatusBadge({ status }: { status: string }) {
  if (status === 'successful' || status === 'completed') return (
    <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
      <CheckCircle2 className="h-3 w-3" /> {status === 'completed' ? 'Completed' : 'Successful'}
    </Badge>
  )
  if (status === 'failed') return (
    <Badge variant="outline" className="gap-1 text-destructive border-red-200 bg-red-50">
      <XCircle className="h-3 w-3" /> Failed
    </Badge>
  )
  return (
    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(v)
}

const PER_PAGE = 15

export default function TransactionsPage() {
  const { search, status, page, setSearch, setStatus, setPage, getFilter, update } = useUrlListState()
  const gateway = getFilter('payment_method', getFilter('gateway'))
  const setGateway = (value: string) => update({ payment_method: value === 'all' ? null : value, gateway: null, page: null })
  const debouncedSearch = useDebounce(search, 300)
  const [exporting, setExporting] = useState(false)

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['transactions', { status, gateway, page, q: debouncedSearch }],
    queryFn:  () => listTransactions({
      status:  status  !== 'all' ? status  : undefined,
      payment_method: gateway !== 'all' ? gateway : undefined,
      q: debouncedSearch || undefined,
      page,
      per_page: PER_PAGE,
    }),
    staleTime: 30_000,
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportTransactions()
      toast.success('Export started — file will download shortly')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const transactions = data?.data ?? []

  const columns: ColumnDef<Transaction, unknown>[] = [
    {
      id: 'reference',
      header: 'Reference',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-foreground">{row.original.reference}</span>
      ),
    },
    {
      id: 'organization',
      header: 'Organization',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary uppercase">
            {row.original.organization?.name?.[0] ?? '?'}
          </div>
          <span className="text-sm">{row.original.organization?.name ?? '—'}</span>
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="text-sm font-semibold tabular-nums">{fmt(row.original.amount)}</span>
      ),
    },
    {
      id: 'plan',
      header: 'Plan',
      cell: ({ row }) => {
        const sub = row.original.subscription
        return sub?.plan?.name ? (
          <div className="space-y-0.5">
            <p className="text-sm">{sub.plan.name}</p>
            {sub.billing_cycle && (
              <p className="text-xs text-muted-foreground capitalize">{sub.billing_cycle}</p>
            )}
          </div>
        ) : <span className="text-muted-foreground">—</span>
      },
    },
    {
      id: 'payment_method',
      header: 'Gateway',
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize text-xs">{row.original.payment_method}</Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <TransactionStatusBadge status={row.original.status} />,
    },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) => {
        const d = row.original.paid_at ?? row.original.created_at
        return (
          <span className="text-xs text-muted-foreground">
            {format(new Date(d), 'MMM d, yyyy · h:mm a')}
          </span>
        )
      },
    },
  ]

  const toolbar = (
    <div className="space-y-3">
      <FilterBar search={search} onSearchChange={setSearch} searchLabel="Search payments" placeholder="Organization or payment reference" onReset={() => update({ q: null, status: null, payment_method: null, gateway: null, page: null })} filters={[
        ...(status !== 'all' ? [{ key: 'status', label: `Status: ${status}`, onRemove: () => setStatus('all') }] : []),
        ...(gateway !== 'all' ? [{ key: 'method', label: `Method: ${gateway}`, onRemove: () => setGateway('all') }] : []),
      ]}>
        <div><label id="payment-status-label" className="mb-1.5 block text-xs font-medium">Status</label><Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-labelledby="payment-status-label" className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select></div>
        <div><label id="payment-method-label" className="mb-1.5 block text-xs font-medium">Payment method</label><Select value={gateway} onValueChange={setGateway}>
          <SelectTrigger aria-labelledby="payment-method-label" className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{GATEWAY_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select></div>
      </FilterBar>
      <Button variant="outline" onClick={handleExport} disabled={exporting}><Download className="mr-2 h-4 w-4" />{exporting ? 'Exporting…' : 'Export all payments'}</Button>
    </div>
  )
  return (
    <BillingWorkspace
      title="Payments"
      description={data?.meta?.total != null ? `${data.meta.total} payment records with filters and export` : 'Payment transaction history with filters and export.'}
    >
      <p className="text-xs text-muted-foreground">Search and filters apply across payment records. The CSV export includes all payments.</p>
      <DataTable
        data={transactions}
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
    </BillingWorkspace>
  )
}
