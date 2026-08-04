'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Search, Download, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

import { DataTable }   from '@/components/shared/DataTable'
import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { Badge }       from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { listInvoices, downloadInvoice } from '@/features/subscriptions/api'
import { SubscriptionWorkspace } from '@/features/subscriptions/components/SubscriptionWorkspace'
import type { Invoice } from '@/types/api'

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
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage]     = useState(1)
  const [downloading, setDownloading] = useState<string | number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { status, page }],
    queryFn:  () => listInvoices({
      status:   status !== 'all' ? status : undefined,
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

  const invoices = (data?.data ?? []).filter((inv) =>
    !search ||
    inv.organization?.name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase())
  )

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
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-full flex-1 sm:min-w-[200px] sm:max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search org or invoice #…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-8"
        />
      </div>
      <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
        <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <SubscriptionWorkspace
      title="Invoices"
      description={data?.meta?.total != null ? `${data.meta.total} billing documents available` : 'Billing documents with status filters and PDF downloads.'}
    >
      <DataTable
        data={invoices}
        columns={columns}
        isLoading={isLoading}
        toolbar={toolbar}
        pagination={{ pageIndex: page - 1, pageSize: PER_PAGE }}
        pageCount={data?.meta?.last_page ?? 1}
        onPaginationChange={(s) => setPage(s.pageIndex + 1)}
      />
    </SubscriptionWorkspace>
  )
}
