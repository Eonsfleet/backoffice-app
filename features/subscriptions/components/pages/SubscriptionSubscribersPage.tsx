'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Users, Search, MoreHorizontal, Eye, RefreshCw, Pencil,
  CheckCircle2, XCircle, Clock, Car, CreditCard, ArrowRightLeft, Ban,
  UploadCloud, Trash2,
} from 'lucide-react'

import { DataTable }     from '@/components/shared/DataTable'
import { StatusBadge }   from '@/components/shared/StatusBadge'
import { SlideOver }     from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button }        from '@/components/ui/button'
import { Badge }         from '@/components/ui/badge'
import { Input }         from '@/components/ui/input'
import { Label }         from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton }      from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  listSubscribers, getSubscription, getSubscriptionTransactions,
  listPlans, updateSubscription, changeOrganizationPlan, extendPocSubscription,
  getOrganizationBillingHistory, retryLotRenewal, cancelSubscriptionImmediately,
  importLegacyAssets, convertPocToProduction, revertOrganizationToPoc,
  anonymizeOrganization,
} from '@/features/subscriptions/api'
import { SubscriptionWorkspace } from '@/features/subscriptions/components/SubscriptionWorkspace'
import { usePermission } from '@/hooks/usePermission'
import type { SubStatus, Subscription, SubscriptionPlan, Transaction } from '@/types/api'

const STATUS_OPTIONS = [
  { value: 'all',        label: 'All Statuses' },
  { value: 'active',     label: 'Active' },
  { value: 'trial',      label: 'Trial' },
  { value: 'grace',      label: 'Grace' },
  { value: 'suspended',  label: 'Suspended' },
  { value: 'expired',    label: 'Expired' },
]

const TYPE_OPTIONS = [
  { value: 'all',        label: 'All Types' },
  { value: 'production', label: 'Production' },
  { value: 'poc',        label: 'POC' },
]

const PAYMENT_OPTIONS = [
  { value: 'all',       label: 'All Payments' },
  { value: 'current',   label: 'Current' },
  { value: 'failed',    label: 'Failed' },
  { value: 'suspended', label: 'Suspended' },
]

const EDIT_STATUS_OPTIONS: Array<{ value: SubStatus; label: string }> = [
  { value: 'expired',    label: 'Expired' },
  { value: 'suspended',  label: 'Suspended' },
  { value: 'canceled',   label: 'Canceled' },
]

const CYCLE_OPTIONS = [
  { value: 'all',     label: 'All Cycles' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
]

function fmt(v?: number) {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(v)
}

function fmtMinor(v?: number | null) {
  return v == null ? '—' : fmt(v / 100)
}

function TxStatusIcon({ status }: { status: Transaction['status'] }) {
  if (status === 'successful') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
  if (status === 'failed')     return <XCircle      className="h-3.5 w-3.5 text-destructive shrink-0" />
  return <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
}

function toDateInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd')
}

function editableStatus(status: SubStatus): SubStatus {
  return ['expired', 'suspended', 'canceled'].includes(status) ? status : 'expired'
}

function DataPoint({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <div className={`mt-1 text-sm font-semibold ${accent ?? 'text-foreground'}`}>{value}</div>
    </div>
  )
}

function SubscriptionEditForm({
  subscription,
  saving,
  onSubmit,
}: {
  subscription: Subscription
  saving: boolean
  onSubmit: (payload: {
    status: SubStatus
    ended_at: string | null
    trial_ends_at: string | null
    poc_asset_limit: number | null
    note?: string
  }) => void
}) {
  const [status, setStatus] = useState<SubStatus>(editableStatus(subscription.status))
  const [endedAt, setEndedAt] = useState(toDateInput(subscription.ends_at ?? subscription.next_billing_date))
  const [trialEndsAt, setTrialEndsAt] = useState(toDateInput(subscription.trial_ends_at))
  const [pocAssetLimit, setPocAssetLimit] = useState(subscription.poc_asset_limit?.toString() ?? '')
  const [note, setNote] = useState('')

  return (
    <form
      className="space-y-4 px-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          status,
          ended_at: endedAt || null,
          trial_ends_at: trialEndsAt || null,
          poc_asset_limit: pocAssetLimit === '' ? null : Number(pocAssetLimit),
          note: note.trim() || undefined,
        })
      }}
    >
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-medium">{subscription.organization?.name ?? 'Subscription'}</p>
        <p className="text-xs text-muted-foreground">Current plan: {subscription.plan?.name ?? '—'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as SubStatus)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EDIT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Expiry Date</Label>
          <Input type="date" value={endedAt} onChange={(event) => setEndedAt(event.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Trial Expiry</Label>
          <Input type="date" value={trialEndsAt} onChange={(event) => setTrialEndsAt(event.target.value)} />
        </div>
        {subscription.subscription_type === 'poc' && (
          <div className="space-y-2 sm:col-span-2">
            <Label>POC Asset Limit</Label>
            <Input type="number" min={0} value={pocAssetLimit} onChange={(event) => setPocAssetLimit(event.target.value)} />
          </div>
        )}
        <div className="space-y-2 sm:col-span-2">
          <Label>Audit Note</Label>
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Reason for this change"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}

function ChangePlanForm({
  subscription,
  plans,
  saving,
  onSubmit,
}: {
  subscription: Subscription
  plans: SubscriptionPlan[]
  saving: boolean
  onSubmit: (planId: string | number) => void
}) {
  const [planId, setPlanId] = useState(String(subscription.plan?.id ?? ''))

  return (
    <form
      className="space-y-4 px-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(planId)
      }}
    >
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-medium">{subscription.organization?.name ?? 'Subscription'}</p>
        <p className="text-xs text-muted-foreground">Current plan: {subscription.plan?.name ?? '—'}</p>
      </div>
      <div className="space-y-2">
        <Label>Target Plan</Label>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select plan" /></SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={String(plan.id)}>
                {plan.name}{!plan.is_public ? ' · hidden' : ''}{plan.has_custom_pricing ? ' · custom' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={saving || !planId || planId === String(subscription.plan?.id ?? '')}>
        {saving ? 'Changing...' : 'Change Plan'}
      </Button>
    </form>
  )
}

function CancelSubscriptionForm({
  subscription,
  saving,
  onSubmit,
}: {
  subscription: Subscription
  saving: boolean
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState('')

  return (
    <form
      className="space-y-4 px-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(reason)
      }}
    >
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-sm font-medium">{subscription.organization?.name ?? 'Subscription'}</p>
        <p className="text-xs text-muted-foreground">
          This ends the subscription immediately — for fraud/legal/policy violations only, never a routine cancellation.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Reason</Label>
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Why is this subscription being cancelled immediately?"
          required
        />
      </div>
      <Button type="submit" variant="destructive" disabled={saving || !reason.trim()}>
        {saving ? 'Cancelling...' : 'Cancel Subscription Immediately'}
      </Button>
    </form>
  )
}

type LegacyVehicleRow = { onboarded_date: string; registration_number: string; fuel_capacity: string }

function LegacyAssetImportForm({
  subscription,
  saving,
  onSubmit,
}: {
  subscription: Subscription
  saving: boolean
  onSubmit: (payload: { vehicles: LegacyVehicleRow[] }) => void
}) {
  const [rows, setRows] = useState<LegacyVehicleRow[]>([
    { onboarded_date: '', registration_number: '', fuel_capacity: '' },
  ])

  const updateRow = (index: number, patch: Partial<LegacyVehicleRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <form
      className="space-y-4 px-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ vehicles: rows })
      }}
    >
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-medium">{subscription.organization?.name ?? 'Organization'}</p>
        <p className="text-xs text-muted-foreground">
          Onboards existing vehicles preserving their true onboarded date; billing anchors to that date&apos;s anniversary and settles immediately.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase text-muted-foreground">Vehicle {i + 1}</Label>
              {rows.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <Input
              placeholder="Registration number"
              value={row.registration_number}
              onChange={(e) => updateRow(i, { registration_number: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={row.onboarded_date}
                onChange={(e) => updateRow(i, { onboarded_date: e.target.value })}
                required
              />
              <Input
                type="number"
                min={1}
                placeholder="Fuel capacity"
                value={row.fuel_capacity}
                onChange={(e) => updateRow(i, { fuel_capacity: e.target.value })}
                required
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRows((prev) => [...prev, { onboarded_date: '', registration_number: '', fuel_capacity: '' }])}
      >
        <UploadCloud className="mr-2 h-3.5 w-3.5" /> Add Another Vehicle
      </Button>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Importing...' : `Import ${rows.length} Vehicle${rows.length === 1 ? '' : 's'}`}
        </Button>
      </div>
    </form>
  )
}

function ConvertPocForm({
  subscription,
  saving,
  onSubmit,
}: {
  subscription: Subscription
  saving: boolean
  onSubmit: (payload: { name: string; email: string; fleet_size: number; industry: string }) => void
}) {
  const [name, setName] = useState(subscription.organization?.name ?? '')
  const [email, setEmail] = useState('')
  const [fleetSize, setFleetSize] = useState('')
  const [industry, setIndustry] = useState('')

  return (
    <form
      className="space-y-4 px-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ name, email, fleet_size: Number(fleetSize), industry })
      }}
    >
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-medium">{subscription.organization?.name ?? 'Organization'}</p>
        <p className="text-xs text-muted-foreground">Converts this POC into a new production organization, re-parenting its fleet.</p>
      </div>
      <div className="space-y-2">
        <Label>Organization Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Contact Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Fleet Size</Label>
          <Input type="number" min={1} value={fleetSize} onChange={(e) => setFleetSize(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Industry</Label>
          <Input value={industry} onChange={(e) => setIndustry(e.target.value)} required />
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? 'Converting...' : 'Convert to Production'}
      </Button>
    </form>
  )
}

function RevertToPocForm({
  subscription,
  plans,
  saving,
  onSubmit,
}: {
  subscription: Subscription
  plans: SubscriptionPlan[]
  saving: boolean
  onSubmit: (payload: { plan_id: string; evaluation_days: number; reason: string }) => void
}) {
  const [planId, setPlanId] = useState('')
  const [evaluationDays, setEvaluationDays] = useState('30')
  const [reason, setReason] = useState('')

  return (
    <form
      className="space-y-4 px-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ plan_id: planId, evaluation_days: Number(evaluationDays), reason })
      }}
    >
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-medium">{subscription.organization?.name ?? 'Organization'}</p>
        <p className="text-xs text-muted-foreground">Ends the current production subscription and starts a fresh evaluation window.</p>
      </div>
      <div className="space-y-2">
        <Label>Evaluation Plan</Label>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select plan" /></SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Evaluation Days</Label>
        <Input type="number" min={1} value={evaluationDays} onChange={(e) => setEvaluationDays(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Reason</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this reverting to POC?" required />
      </div>
      <Button type="submit" disabled={saving || !planId}>
        {saving ? 'Reverting...' : 'Revert to POC'}
      </Button>
    </form>
  )
}

function AnonymizeConfirmForm({
  subscription,
  saving,
  onConfirm,
}: {
  subscription: Subscription
  saving: boolean
  onConfirm: () => void
}) {
  const [typed, setTyped] = useState('')
  const orgName = subscription.organization?.name ?? ''
  const matches = typed.trim() === orgName

  return (
    <div className="space-y-4 px-5">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-sm font-medium text-destructive">This is irreversible</p>
        <p className="text-xs text-muted-foreground">
          Redacts every human-identifying field for &quot;{orgName}&quot;. Financial records (invoices, transactions) are kept.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Type the organization name to confirm</Label>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={orgName} />
      </div>
      <Button type="button" variant="destructive" disabled={saving || !matches} onClick={onConfirm}>
        {saving ? 'Anonymizing...' : 'Anonymize Organization'}
      </Button>
    </div>
  )
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function SubscriberDetail({ subscription }: { subscription: Subscription }) {
  const qc = useQueryClient()
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
  const organizationId = sub.organization?.id

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['organization-billing-history', organizationId],
    queryFn:  () => getOrganizationBillingHistory(organizationId!),
    enabled:  !!organizationId,
    staleTime: 30_000,
  })

  const retryLotMutation = useMutation({
    mutationFn: retryLotRenewal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization-billing-history', organizationId] })
      toast.success('Renewal retry initiated')
    },
    onError: () => toast.error('Renewal retry failed'),
  })

  return (
    <div className="space-y-6 px-5">
      <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
        <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Organization</p>
            <p className="text-sm font-semibold">{sub.organization?.name}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="uppercase">{sub.subscription_type ?? 'unknown'}</Badge>
              {sub.is_payment_restricted && <Badge variant="destructive">Restricted</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 min-[420px]:justify-end">
            <StatusBadge status={sub.status} />
            {sub.payment_state && <StatusBadge status={sub.payment_state} />}
          </div>
        </div>

        <div className="grid gap-3 min-[420px]:grid-cols-2">
          <DataPoint label="Plan" value={sub.plan?.name ?? '—'} />
          <DataPoint label="Billing Cycle" value={<span className="capitalize">{sub.billing_cycle ?? '—'}</span>} />
          <DataPoint
            label="Started"
            value={sub.started_at ? format(new Date(sub.started_at), 'MMM d, yyyy') : '—'}
          />
          <DataPoint
            label="Renews / Ends"
            value={(() => {
                const d = sub.next_billing_date ?? sub.ends_at
                return d ? format(new Date(d), 'MMM d, yyyy') : '—'
              })()}
          />
          {sub.mrr != null && <DataPoint label="MRR" value={fmt(sub.mrr)} accent="text-emerald-600" />}
          {sub.vehicle_count != null && (
            <DataPoint
              label="Vehicles"
              value={
                <span className="flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5 text-muted-foreground" />
                  {sub.vehicle_count}
                </span>
              }
            />
          )}
          {sub.poc_asset_limit != null && <DataPoint label="POC Asset Limit" value={sub.poc_asset_limit} />}
          {sub.plan_change_effective_at && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 min-[420px]:col-span-2">
              <p className="text-xs font-medium">Scheduled plan change</p>
              <p className="text-xs">Effective {format(new Date(sub.plan_change_effective_at), 'MMM d, yyyy')}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Billing Groups</p>
        {loadingHistory ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : !history?.lots?.length ? (
          <div className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">No billing groups yet</div>
        ) : (
          <ul className="space-y-2">
            {history.lots.map((lot) => (
              <li key={lot.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{lot.name ?? `Billing group #${lot.id}`}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {lot.status ?? '—'} · {lot.billing_cycle ?? '—'} · {lot.vehicle_count ?? 0} assets
                    </p>
                  </div>
                  <StatusBadge status={lot.status ?? 'unknown'} />
                </div>
                <div className="mt-3 grid gap-2 text-xs min-[420px]:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Rate</p>
                    <p className="font-medium tabular-nums">{fmtMinor(lot.rate_minor)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-medium tabular-nums">{fmtMinor(lot.total_minor)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Renews</p>
                    <p className="font-medium">{lot.next_renewal_at ? format(new Date(lot.next_renewal_at), 'MMM d') : '—'}</p>
                  </div>
                </div>
                {['failed', 'suspended', 'past_due'].includes(lot.status ?? '') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    disabled={retryLotMutation.isPending}
                    onClick={() => retryLotMutation.mutate(lot.id)}
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry Renewal
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
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
  const [type, setType]       = useState('all')
  const [paymentState, setPaymentState] = useState('all')
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)

  const [viewSub, setViewSub]       = useState<Subscription | null>(null)
  const [editSub, setEditSub]       = useState<Subscription | null>(null)
  const [changePlanSub, setChangePlanSub] = useState<Subscription | null>(null)
  const [extendPocSub, setExtendPocSub] = useState<Subscription | null>(null)
  const [cancelSub, setCancelSub] = useState<Subscription | null>(null)
  const [legacyImportSub, setLegacyImportSub] = useState<Subscription | null>(null)
  const [convertPocSub, setConvertPocSub] = useState<Subscription | null>(null)
  const [revertPocSub, setRevertPocSub] = useState<Subscription | null>(null)
  const [anonymizeSub, setAnonymizeSub] = useState<Subscription | null>(null)
  const canManageMoney = usePermission('admin.billing.money')
  const canManageCatalog = usePermission('admin.billing.manage_catalog')

  const { data, isLoading } = useQuery({
    queryKey: ['subscribers', { status, cycle, type, paymentState, search, page }],
    queryFn:  () => listSubscribers({
      q:             search || undefined,
      status:        status !== 'all' ? status : undefined,
      billing_cycle: cycle  !== 'all' ? cycle  : undefined,
      subscription_type: type !== 'all' ? type : undefined,
      payment_state: paymentState !== 'all' ? paymentState : undefined,
      page,
      per_page: PER_PAGE,
    }),
    staleTime: 30_000,
  })

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: listPlans,
    staleTime: 60_000,
  })

  const updateMutation = useMutation({
    mutationFn: ({ sub, payload }: { sub: Subscription; payload: Parameters<typeof updateSubscription>[1] }) =>
      updateSubscription(sub.id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      qc.invalidateQueries({ queryKey: ['subscription', updated.id] })
      qc.invalidateQueries({ queryKey: ['audit-logs'] })
      toast.success('Subscription updated')
      setEditSub(null)
    },
    onError: () => toast.error('Update failed'),
  })

  const changePlanMutation = useMutation({
    mutationFn: ({ sub, planId }: { sub: Subscription; planId: string | number }) =>
      changeOrganizationPlan(sub.organization.id, sub.id, planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      qc.invalidateQueries({ queryKey: ['organization-billing-history'] })
      toast.success('Plan change queued')
      setChangePlanSub(null)
    },
    onError: () => toast.error('Plan change failed'),
  })

  const extendPocMutation = useMutation({
    mutationFn: ({ sub, extraDays }: { sub: Subscription; extraDays: number }) =>
      extendPocSubscription(sub.organization.id, extraDays),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      toast.success('POC extension approved')
      setExtendPocSub(null)
    },
    onError: () => toast.error('POC extension failed'),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ sub, reason }: { sub: Subscription; reason: string }) =>
      cancelSubscriptionImmediately(sub.organization.id, sub.id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      qc.invalidateQueries({ queryKey: ['organization-billing-history'] })
      toast.success('Subscription cancelled')
      setCancelSub(null)
    },
    onError: () => toast.error('Cancellation failed'),
  })

  const legacyImportMutation = useMutation({
    mutationFn: ({ sub, vehicles }: { sub: Subscription; vehicles: LegacyVehicleRow[] }) =>
      importLegacyAssets(sub.organization.id, {
        vehicles: vehicles.map((v) => ({
          onboarded_date: v.onboarded_date,
          registration_number: v.registration_number,
          fuel_capacity: Number(v.fuel_capacity),
        })),
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      qc.invalidateQueries({ queryKey: ['organization-billing-history'] })
      toast.success(`Imported ${result.vehicle_count} legacy vehicle(s)`)
      setLegacyImportSub(null)
    },
    onError: () => toast.error('Legacy asset import failed'),
  })

  const convertPocMutation = useMutation({
    mutationFn: ({
      sub, payload,
    }: { sub: Subscription; payload: { name: string; email: string; fleet_size: number; industry: string } }) =>
      convertPocToProduction(sub.organization.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      toast.success('Organization converted to production')
      setConvertPocSub(null)
    },
    onError: () => toast.error('POC conversion failed'),
  })

  const revertPocMutation = useMutation({
    mutationFn: ({
      sub, payload,
    }: { sub: Subscription; payload: { plan_id: string; evaluation_days: number; reason: string } }) =>
      revertOrganizationToPoc(sub.organization.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      toast.success('Organization reverted to POC')
      setRevertPocSub(null)
    },
    onError: () => toast.error('Revert to POC failed'),
  })

  const anonymizeMutation = useMutation({
    mutationFn: (sub: Subscription) => anonymizeOrganization(sub.organization.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      toast.success('Organization anonymized')
      setAnonymizeSub(null)
    },
    onError: () => toast.error('Anonymization failed'),
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
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status} />
          {row.original.payment_state && row.original.payment_state !== 'current' && (
            <p className="text-xs capitalize text-amber-700">{row.original.payment_state}</p>
          )}
        </div>
      ),
    },
    {
      id: 'subscription_type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm uppercase text-muted-foreground">{row.original.subscription_type ?? '—'}</span>
      ),
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
              <DropdownMenuItem onClick={() => setEditSub(sub)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setChangePlanSub(sub)}>
                <ArrowRightLeft className="mr-2 h-4 w-4" /> Change Plan
              </DropdownMenuItem>
              {sub.subscription_type === 'poc' && (
                <DropdownMenuItem onClick={() => setExtendPocSub(sub)}>
                  <Clock className="mr-2 h-4 w-4" /> Extend POC
                </DropdownMenuItem>
              )}
              {canManageMoney && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setCancelSub(sub)}
                  >
                    <Ban className="mr-2 h-4 w-4" /> Cancel Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLegacyImportSub(sub)}>
                    <UploadCloud className="mr-2 h-4 w-4" /> Import Legacy Assets
                  </DropdownMenuItem>
                </>
              )}
              {canManageCatalog && sub.subscription_type === 'poc' && (
                <DropdownMenuItem onClick={() => setConvertPocSub(sub)}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" /> Convert POC → Production
                </DropdownMenuItem>
              )}
              {canManageCatalog && sub.subscription_type !== 'poc' && (
                <DropdownMenuItem onClick={() => setRevertPocSub(sub)}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" /> Revert to POC
                </DropdownMenuItem>
              )}
              {canManageCatalog && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setAnonymizeSub(sub)}
                >
                  <Ban className="mr-2 h-4 w-4" /> Anonymize Organization
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-full flex-1 sm:min-w-[180px] sm:max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search organization…"
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
      <Select value={cycle} onValueChange={(v) => { setCycle(v); setPage(1) }}>
        <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CYCLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={type} onValueChange={(v) => { setType(v); setPage(1) }}>
        <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={paymentState} onValueChange={(v) => { setPaymentState(v); setPage(1) }}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PAYMENT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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

      <SlideOver
        open={!!editSub}
        onOpenChange={(o) => !o && setEditSub(null)}
        title="Edit Subscription Status"
        description={editSub ? `${editSub.organization?.name ?? 'Organization'} · ${editSub.plan?.name ?? 'Plan'}` : undefined}
        width="lg"
      >
        {editSub && (
          <SubscriptionEditForm
            key={editSub.id}
            subscription={editSub}
            saving={updateMutation.isPending}
            onSubmit={(payload) => updateMutation.mutate({ sub: editSub, payload })}
          />
        )}
      </SlideOver>

      <SlideOver
        open={!!changePlanSub}
        onOpenChange={(o) => !o && setChangePlanSub(null)}
        title="Change Plan"
        description={changePlanSub ? `${changePlanSub.organization?.name ?? 'Organization'} · admins may assign hidden/custom plans` : undefined}
        width="lg"
      >
        {changePlanSub && (
          loadingPlans ? (
            <div className="space-y-3 px-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <ChangePlanForm
              key={changePlanSub.id}
              subscription={changePlanSub}
              plans={plans}
              saving={changePlanMutation.isPending}
              onSubmit={(planId) => changePlanMutation.mutate({ sub: changePlanSub, planId })}
            />
          )
        )}
      </SlideOver>

      {extendPocSub && (
        <ConfirmDialog
          open={!!extendPocSub}
          onOpenChange={(o) => !o && setExtendPocSub(null)}
          title="Extend POC"
          description={`Approve a 14-day POC extension for "${extendPocSub.organization?.name}"?`}
          confirmLabel="Extend"
          onConfirm={() => extendPocMutation.mutateAsync({ sub: extendPocSub, extraDays: 14 })}
        />
      )}

      <SlideOver
        open={!!cancelSub}
        onOpenChange={(o) => !o && setCancelSub(null)}
        title="Cancel Subscription Immediately"
        description={cancelSub ? `${cancelSub.organization?.name ?? 'Organization'} · this cannot be undone` : undefined}
        width="lg"
      >
        {cancelSub && (
          <CancelSubscriptionForm
            key={cancelSub.id}
            subscription={cancelSub}
            saving={cancelMutation.isPending}
            onSubmit={(reason) => cancelMutation.mutate({ sub: cancelSub, reason })}
          />
        )}
      </SlideOver>

      <SlideOver
        open={!!legacyImportSub}
        onOpenChange={(o) => !o && setLegacyImportSub(null)}
        title="Import Legacy Assets"
        description={legacyImportSub ? `${legacyImportSub.organization?.name ?? 'Organization'} · onboard pre-existing vehicles` : undefined}
        width="lg"
      >
        {legacyImportSub && (
          <LegacyAssetImportForm
            key={legacyImportSub.id}
            subscription={legacyImportSub}
            saving={legacyImportMutation.isPending}
            onSubmit={({ vehicles }) => legacyImportMutation.mutate({ sub: legacyImportSub, vehicles })}
          />
        )}
      </SlideOver>

      <SlideOver
        open={!!convertPocSub}
        onOpenChange={(o) => !o && setConvertPocSub(null)}
        title="Convert POC to Production"
        description={convertPocSub ? `${convertPocSub.organization?.name ?? 'Organization'} · creates a new production organization` : undefined}
        width="lg"
      >
        {convertPocSub && (
          <ConvertPocForm
            key={convertPocSub.id}
            subscription={convertPocSub}
            saving={convertPocMutation.isPending}
            onSubmit={(payload) => convertPocMutation.mutate({ sub: convertPocSub, payload })}
          />
        )}
      </SlideOver>

      <SlideOver
        open={!!revertPocSub}
        onOpenChange={(o) => !o && setRevertPocSub(null)}
        title="Revert to POC"
        description={revertPocSub ? `${revertPocSub.organization?.name ?? 'Organization'} · ends the production subscription` : undefined}
        width="lg"
      >
        {revertPocSub && (
          loadingPlans ? (
            <div className="space-y-3 px-5"><Skeleton className="h-10 w-full" /></div>
          ) : (
            <RevertToPocForm
              key={revertPocSub.id}
              subscription={revertPocSub}
              plans={plans}
              saving={revertPocMutation.isPending}
              onSubmit={(payload) => revertPocMutation.mutate({ sub: revertPocSub, payload })}
            />
          )
        )}
      </SlideOver>

      <SlideOver
        open={!!anonymizeSub}
        onOpenChange={(o) => !o && setAnonymizeSub(null)}
        title="Anonymize Organization"
        description={anonymizeSub ? anonymizeSub.organization?.name : undefined}
        width="lg"
      >
        {anonymizeSub && (
          <AnonymizeConfirmForm
            key={anonymizeSub.id}
            subscription={anonymizeSub}
            saving={anonymizeMutation.isPending}
            onConfirm={() => anonymizeMutation.mutate(anonymizeSub)}
          />
        )}
      </SlideOver>
    </SubscriptionWorkspace>
  )
}
