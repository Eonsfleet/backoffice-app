'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Download, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

import { DataTable }   from '@/components/shared/DataTable'
import { Button }      from '@/components/ui/button'
import { FilterBar } from '@/components/shared/FilterBar'
import { Badge }       from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { listInvoices, downloadInvoice } from '@/features/subscriptions/api'
import { BillingWorkspace } from '@/features/billing/components/BillingWorkspace'
import type { Invoice } from '@/types/api'
import { useUrlListState } from '@/hooks/useUrlListState'
import { useDebounce } from '@/hooks/useDebounce'

const STATUS_OPTIONS = [
  { value: 'all',    label: 'All Statuses' },
  { value: 'issued', label: 'Issued' },
  { value: 'paid',   label: 'Paid' },
  { value: 'void',   label: 'Void' },
]

function InvoiceStatusBadge({ status }: { status: Invoice['status'] }) {
  if (status === 'paid') return (
    <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
      <CheckCircle2 className="h-3 w-3" /> Paid
    </Badge>
  )
  if (status === 'void') return (
    <Badge variant="outline" className="gap-1 text-destructive border-red-200 bg-red-50">
      <XCircle className="h-3 w-3" /> Void
    </Badge>
  )
  return (
    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
      <AlertCircle className="h-3 w-3" /> Issued
    </Badge>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(v)
}

const PER_PAGE = 15

export default function InvoicesPage() {
  const { search, status, page, setSearch, setStatus, setPage, update } = useUrlListState()
  const debouncedSearch = useDebounce(search, 300)
  const [downloading, setDownloading] = useState<string | number | null>(null)

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['invoices', { status, page, q: debouncedSearch }],
    queryFn:  () => listInvoices({
      status:   status !== 'all' ? status : undefined,
      q: debouncedSearch || undefined,
      page,
      per_page: PER_PAGE,
    }),
    staleTime: 30_000,
  })

  const handleDownload = async (id: string | number) => {
    setDownloading(id)
    try {
      await downloadInvoice(id)
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(null)
    }
  }

  const invoices = data?.data ?? []

  const columns: ColumnDef<Invoice, unknown>[] = [
    {
      id: 'invoice_number',
      header: 'Invoice',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-foreground">
          {row.original.invoice_number}
        </span>
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
      id: 'plan',
      header: 'Plan',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.plan ?? '—'}</span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-semibold tabular-nums">{row.original.amount != null ? fmt(row.original.amount) : '—'}</p>
          {!!row.original.vat && row.original.vat > 0 && (
            <p className="text-[11px] text-muted-foreground">VAT {fmt(row.original.vat)}</p>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
    },
    {
      id: 'created_at',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.created_at ? format(new Date(row.original.created_at), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const inv = row.original
        const isLoading = downloading === inv.id
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={isLoading}
            onClick={() => handleDownload(inv.id)}
          >
            <Download className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-bounce' : ''}`} />
            PDF
          </Button>
        )
      },
    },
  ]

  const toolbar = (
    <FilterBar search={search} onSearchChange={setSearch} searchLabel="Search invoices" placeholder="Organization or invoice number" onReset={() => update({ q: null, status: null, page: null })} filters={status !== 'all' ? [{ key: 'status', label: `Status: ${status}`, onRemove: () => setStatus('all') }] : []}>
      <div><label id="invoice-status-label" className="mb-1.5 block text-xs font-medium">Status</label><Select value={status} onValueChange={setStatus}>
        <SelectTrigger aria-labelledby="invoice-status-label" className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>{STATUS_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select></div>
    </FilterBar>
  )
  return (
    <BillingWorkspace
      title="Invoices"
      description={data?.meta?.total != null ? `${data.meta.total} billing documents available` : 'Billing documents with status filters and PDF downloads.'}
    >
      <p className="text-xs text-muted-foreground">Search and status filters apply across all invoices.</p>
      <DataTable
        data={invoices}
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
