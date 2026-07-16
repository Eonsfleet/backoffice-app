'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Users, Search, MoreHorizontal, Eye, RefreshCw,
  CheckCircle2, XCircle, Clock, Car, CreditCard,
} from 'lucide-react'

import { DataTable }     from '@/components/shared/DataTable'
import { StatusBadge }   from '@/components/shared/StatusBadge'
import { SlideOver }     from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button }        from '@/components/ui/button'
import { Input }         from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton }      from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  listSubscribers, getSubscription, getSubscriptionTransactions, retryPayment,
} from '@/features/subscriptions/api'
import { SubscriptionWorkspace } from '@/features/subscriptions/components/SubscriptionWorkspace'
import type { Subscription, Transaction } from '@/types/api'

const STATUS_OPTIONS = [
  { value: 'all',        label: 'All Statuses' },
  { value: 'active',     label: 'Active' },
  { value: 'trial',      label: 'Trial' },
  { value: 'grace',      label: 'Grace' },
  { value: 'suspended',  label: 'Suspended' },
  { value: 'expired',    label: 'Expired' },
]

const CYCLE_OPTIONS = [
  { value: 'all',     label: 'All Cycles' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual',  label: 'Annual' },
]

function fmt(v?: number) {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(v)
}

function TxStatusIcon({ status }: { status: Transaction['status'] }) {
  if (status === 'successful') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
  if (status === 'failed')     return <XCircle      className="h-3.5 w-3.5 text-destructive shrink-0" />
  return <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function SubscriberDetail({ subscription }: { subscription: Subscription }) {
  const { data: detail } = useQuery({
    queryKey: ['subscription', subscription.id],
    queryFn:  () => getSubscription(subscription.id),
    staleTime: 60_000,
  })

  const { data: txns, isLoading: loadingTxns } = useQuery({
    queryKey: ['subscription-transactions', subscription.id],
    queryFn:  () => getSubscriptionTransactions(subscription.id),
    staleTime: 30_000,
  })

  const sub = detail ?? subscription
  const transactions: Transaction[] = Array.isArray(txns) ? txns : []

  return (
    <div className="space-y-6 px-5">
      {/* Subscription info */}
      <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Organization</p>
            <p className="text-sm font-semibold">{sub.organization?.name}</p>
          </div>
          <StatusBadge status={sub.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="text-sm font-medium">{sub.plan?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Billing Cycle</p>
            <p className="text-sm font-medium capitalize">{sub.billing_cycle ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Started</p>
            <p className="text-sm font-medium">
              {sub.started_at ? format(new Date(sub.started_at), 'MMM d, yyyy') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Renews / Ends</p>
            <p className="text-sm font-medium">
              {(() => {
                const d = sub.next_billing_date ?? sub.ends_at
                return d ? format(new Date(d), 'MMM d, yyyy') : '—'
              })()}
            </p>
          </div>
          {sub.mrr != null && (
            <div>
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-sm font-semibold text-emerald-600">{fmt(sub.mrr)}</p>
            </div>
          )}
          {sub.vehicle_count != null && (
            <div>
              <p className="text-xs text-muted-foreground">Vehicles</p>
              <div className="flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">{sub.vehicle_count}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Transaction History</p>
        {loadingTxns ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CreditCard className="h-6 w-6 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border overflow-hidden">
            {transactions.map((tx: Transaction) => (
              <li key={tx.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <TxStatusIcon status={tx.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs font-medium">{tx.reference}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{tx.payment_method}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold tabular-nums">{fmt(tx.amount)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(tx.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PER_PAGE = 15

export default function SubscribersPage() {
  const qc = useQueryClient()

  const [status, setStatus]   = useState('all')
  const [cycle, setCycle]     = useState('all')
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)

  const [viewSub, setViewSub]       = useState<Subscription | null>(null)
  const [retryTarget, setRetryTarget] = useState<Subscription | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['subscribers', { status, cycle, search, page }],
    queryFn:  () => listSubscribers({
      q:             search || undefined,
      status:        status !== 'all' ? status : undefined,
      billing_cycle: cycle  !== 'all' ? cycle  : undefined,
      page,
      per_page: PER_PAGE,
    }),
    staleTime: 30_000,
  })

  const retryMutation = useMutation({
    mutationFn: (sub: Subscription) => retryPayment(sub.organization.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      toast.success('Payment retry initiated')
      setRetryTarget(null)
    },
    onError: () => toast.error('Retry failed'),
  })

  const subscribers = data?.data ?? []
  const totalMrr = subscribers.reduce((sum, sub) => sum + (sub.mrr ?? 0), 0)
  const activeCount = subscribers.filter((sub) => sub.status === 'active').length
  const attentionCount = subscribers.filter((sub) => ['grace', 'restricted', 'suspended', 'expired'].includes(sub.status)).length

  const columns: ColumnDef<Subscription, unknown>[] = [
    {
      id: 'organization',
      header: 'Organization',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary uppercase">
            {row.original.organization?.name?.[0] ?? '?'}
          </div>
          <span className="text-sm font-medium">{row.original.organization?.name ?? '—'}</span>
        </div>
      ),
    },
    {
      id: 'plan',
      header: 'Plan',
      cell: ({ row }) => <span className="text-sm">{row.original.plan?.name ?? '—'}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'billing_cycle',
      header: 'Cycle',
      cell: ({ row }) => (
        <span className="text-sm capitalize">{row.original.billing_cycle ?? '—'}</span>
      ),
    },
    {
      id: 'mrr',
      header: 'MRR',
      cell: ({ row }) => (
        <span className="text-sm font-medium tabular-nums text-emerald-600">
          {fmt(row.original.mrr)}
        </span>
      ),
    },
    {
      id: 'started_at',
      header: 'Started',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.started_at ? format(new Date(row.original.started_at), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      id: 'ends_at',
      header: 'Renews / Ends',
      cell: ({ row }) => {
        const d = row.original.next_billing_date ?? row.original.ends_at
        return (
          <span className="text-sm text-muted-foreground">
            {d ? format(new Date(d), 'MMM d, yyyy') : '—'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const sub = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setViewSub(sub)}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRetryTarget(sub)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry Payment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[180px] max-w-xs flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search organization…"
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
      <Select value={cycle} onValueChange={(v) => { setCycle(v); setPage(1) }}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CYCLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <SubscriptionWorkspace
      title="Subscribers"
      description={data?.meta?.total != null ? `${data.meta.total} subscriptions across organizations` : 'Track organization subscriptions, renewals, and recovery actions.'}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Page Subscribers</p>
              <p className="text-2xl font-bold">{subscribers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Active On Page</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <RefreshCw className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Page MRR</p>
              <p className="text-2xl font-bold">{fmt(totalMrr)}</p>
              {attentionCount > 0 && <p className="text-xs text-amber-700">{attentionCount} need attention</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={subscribers}
        columns={columns}
        isLoading={isLoading}
        toolbar={toolbar}
        pagination={{ pageIndex: page - 1, pageSize: PER_PAGE }}
        pageCount={data?.meta?.last_page ?? 1}
        onPaginationChange={(s) => setPage(s.pageIndex + 1)}
      />

      {/* Detail drawer */}
      <SlideOver
        open={!!viewSub}
        onOpenChange={(o) => !o && setViewSub(null)}
        title={viewSub?.organization?.name ?? 'Subscription Details'}
        description={viewSub ? `${viewSub.plan?.name ?? 'Plan'} · ${viewSub.billing_cycle ?? ''}` : undefined}
      >
        {viewSub && <SubscriberDetail subscription={viewSub} />}
      </SlideOver>

      {/* Retry payment confirm */}
      {retryTarget && (
        <ConfirmDialog
          open={!!retryTarget}
          onOpenChange={(o) => !o && setRetryTarget(null)}
          title="Retry Payment"
          description={`Retry the last failed payment for "${retryTarget.organization?.name}"?`}
          confirmLabel="Retry"
          onConfirm={() => retryMutation.mutateAsync(retryTarget)}
        />
      )}
    </SubscriptionWorkspace>
  )
}
