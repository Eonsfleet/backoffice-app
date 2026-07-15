'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Search, Download, CheckCircle2, XCircle, Clock } from 'lucide-react'

import { DataTable }   from '@/components/shared/DataTable'
import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { Badge }       from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { listTransactions, exportTransactions } from '@/features/subscriptions/api'
import { SubscriptionWorkspace } from '@/features/subscriptions/components/SubscriptionWorkspace'
import type { Transaction } from '@/types/api'

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
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('all')
  const [gateway, setGateway] = useState('all')
  const [page, setPage]       = useState(1)
  const [exporting, setExporting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { status, gateway, page }],
    queryFn:  () => listTransactions({
      status:  status  !== 'all' ? status  : undefined,
      gateway: gateway !== 'all' ? gateway : undefined,
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

  const transactions = (data?.data ?? []).filter((t) =>
    !search || t.organization?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.reference?.toLowerCase().includes(search.toLowerCase())
  )

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
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search org or reference…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={gateway} onValueChange={(v) => { setGateway(v); setPage(1) }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {GATEWAY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" onClick={handleExport} disabled={exporting}>
        <Download className="mr-2 h-4 w-4" />
        {exporting ? 'Exporting…' : 'Export CSV'}
      </Button>
    </div>
  )

  return (
    <SubscriptionWorkspace
      title="Transactions"
      description={data?.meta?.total != null ? `${data.meta.total} payment records with filters and export` : 'Payment transaction history with filters and export.'}
    >
      <DataTable
        data={transactions}
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
