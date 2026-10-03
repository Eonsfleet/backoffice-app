'use client'
import { usePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/stores/auth.store'
import { QueryError } from '@/components/shared/QueryError'
import { OrgRelations } from './OrgRelations'


import { useState, useEffect, useRef } from 'react'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Building2, Mail, Phone, MapPin, Briefcase, Calendar,
  Pencil, ShieldOff, ShieldCheck, Trash2, ArrowLeft, Loader2,
  Shield, Truck, Route, AlertTriangle, Bell, MapPinned, ChevronRight,
  CreditCard,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SlideOver } from '@/components/shared/SlideOver'
import { OrgFormSlideOver } from '@/features/organizations/components/OrgFormSlideOver'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  getOrganization,
  suspendOrganization,
  unsuspendOrganization,
  deleteOrganization,
  getOrgActivityLog,
  type OrgActivityEntry,
} from '@/features/organizations/api'
import { listPlans, changeOrganizationPlan, assignOrganizationPlan } from '@/features/subscriptions/api'
import { OrgPerformanceTab } from '@/features/organizations/components/OrgPerformanceTab'

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InfoRowProps {
  icon: React.ElementType
  label: string
  value?: string | number | null
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || '—'}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
      <p className="text-2xl font-bold text-foreground">{value ?? '—'}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

// ─── Activity helpers ─────────────────────────────────────────────────────────

const RESOURCE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Trip:                { icon: Route,        color: 'text-blue-500',   bg: 'bg-blue-500/10' },
  Incident:            { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-500/10' },
  MaintenanceJob:      { icon: Truck,        color: 'text-amber-500',  bg: 'bg-amber-500/10' },
  MaintenanceSchedule: { icon: Calendar,     color: 'text-purple-500', bg: 'bg-purple-500/10' },
  MaintenanceAlert:    { icon: Bell,         color: 'text-orange-500', bg: 'bg-orange-500/10' },
  Geofence:            { icon: MapPinned,    color: 'text-emerald-500',bg: 'bg-emerald-500/10' },
}

const ACTION_STYLES: Record<string, string> = {
  created: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function ResourceIcon({ type }: { type: string }) {
  const cfg = RESOURCE_CONFIG[type] ?? { icon: Shield, color: 'text-muted-foreground', bg: 'bg-muted' }
  const Icon = cfg.icon
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
      <Icon className={`h-4 w-4 ${cfg.color}`} />
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_STYLES[action] ?? 'bg-muted text-muted-foreground'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${style}`}>
      {action}
    </span>
  )
}

function ChangesDetail({ changes }: { changes: OrgActivityEntry['changes'] }) {
  if (!changes) return null
  const entries = Object.entries(changes)
  if (entries.length === 0) return null
  return (
    <div className="mt-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs space-y-0.5">
      {entries.map(([field, diff]) => (
        <div key={field} className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-muted-foreground">{field}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-foreground/60 line-through">{String(diff.from ?? '—')}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <span className="font-medium text-foreground">{String(diff.to ?? '—')}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Activity tab ─────────────────────────────────────────────────────────────

const PER_PAGE = 20

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function OrgActivityTab({ identifier }: { identifier: string | number }) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['org-activity', identifier],
    queryFn: ({ pageParam = 1 }) =>
      getOrgActivityLog(identifier, { page: pageParam as number, per_page: PER_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined,
    staleTime: 30_000,
  })

  // Intersection observer — fetch next page when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const logs = data?.pages.flatMap((p) => p.data) ?? []
  const total = data?.pages[0]?.meta.total

  if (isLoading) return <ActivitySkeleton />

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <Shield className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No activity recorded for this organization.</p>
      </div>
    )
  }

  return (
    <div>
      {total != null && (
        <p className="mb-3 text-xs text-muted-foreground">
          Showing {logs.length} of {total} events
        </p>
      )}

      <ul className="divide-y divide-border">
        {logs.map((log) => (
          <li key={log.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
            <ResourceIcon type={log.resource_type} />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground leading-snug">{log.description}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span>{log.changed_by.name ?? 'System'}</span>
                {log.changed_by.email && (
                  <>
                    <span>·</span>
                    <span>{log.changed_by.email}</span>
                  </>
                )}
                <span>·</span>
                <span className="font-mono text-muted-foreground/70">
                  {log.resource_type} #{log.resource_id}
                </span>
              </div>
              <ChangesDetail changes={log.changes} />
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <ActionBadge action={log.action} />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(log.changed_at), { addSuffix: true })}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Sentinel — triggers next page load when scrolled into view */}
      <div ref={sentinelRef} className="py-2 flex justify-center">
        {isFetchingNextPage && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!hasNextPage && logs.length > 0 && (
          <p className="text-xs text-muted-foreground">All events loaded</p>
        )}
      </div>
    </div>
  )
}

// ─── Change plan ──────────────────────────────────────────────────────────────

/**
 * Reassign the organization's plan without going hunting for it under
 * Subscriptions → Subscribers. Addressed by the org *identifier* and the
 * subscription id, because that is what the admin billing endpoints key on.
 */
function ChangePlanPanel({
  organizationIdentifier,
  subscriptionId,
  currentPlanId,
  currentPlanName,
  vehicleCount,
  billingCycle,
  onDone,
}: {
  organizationIdentifier: string | number
  /** Absent when the organization has no subscription yet — assign instead of change. */
  subscriptionId?: string | number
  currentPlanId?: number
  currentPlanName?: string
  vehicleCount?: number
  billingCycle?: 'monthly' | 'yearly'
  onDone: () => void
}) {
  const qc = useQueryClient()
  const isAssign = !subscriptionId
  const [planId, setPlanId] = useState(String(currentPlanId ?? ''))
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>(billingCycle ?? 'monthly')
  // Slots to buy up front. Only meaningful when the org owns no assets yet —
  // an org that already has vehicles is billed for exactly those.
  const [assetCount, setAssetCount] = useState('0')
  const hasAssets = (vehicleCount ?? 0) > 0
  const slots = Number(assetCount) || 0

  const { data: plans = [], isFetching } = useQuery({
    queryKey: ['plans', 'org-change-plan'],
    queryFn: listPlans,
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: () => isAssign
      ? assignOrganizationPlan(organizationIdentifier, planId, cycle, hasAssets ? undefined : slots)
          .then(() => undefined)
      : changeOrganizationPlan(organizationIdentifier, subscriptionId!, planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization'] })
      qc.invalidateQueries({ queryKey: ['organizations'] })
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      toast.success(
        !isAssign ? 'Plan change queued'
          : hasAssets || slots > 0 ? 'Plan assigned — invoice issued'
          : 'Plan assigned'
      )
      onDone()
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? (isAssign ? 'Could not assign plan' : 'Plan change failed'))
    },
  })


  if (isFetching && plans.length === 0) {
    return (
      <div className="space-y-3 px-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    )
  }

  return (
    <form
      className="space-y-4 px-5"
      onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}
    >
      {isAssign ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
          <p className="text-sm font-medium">No subscription yet</p>
          <p className="text-xs text-muted-foreground">
            {hasAssets
              ? `Assigning a plan bills the ${vehicleCount} vehicle${vehicleCount === 1 ? '' : 's'} this organization already owns, and issues an invoice for them.`
              : 'This organization has no assets onboarded. The plan and its per-asset rate are recorded now; billing happens when asset slots are purchased.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Current plan</p>
          <p className="text-sm font-medium">{currentPlanName ?? '—'}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label>{isAssign ? 'Plan' : 'Target Plan'}</Label>
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
        {!isAssign && (
          <p className="text-xs text-muted-foreground">
            An upgrade takes effect immediately; a downgrade is scheduled for the
            end of the current billing period.
          </p>
        )}
      </div>

      {isAssign && (
        <div className="space-y-2">
          <Label>Billing Cycle</Label>
          <Select
            value={cycle}
            onValueChange={(value) => setCycle(value as 'monthly' | 'yearly')}
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isAssign && !hasAssets && (
        <div className="space-y-2">
          <Label>Asset Slots to Purchase</Label>
          <Input
            type="number"
            min={0}
            value={assetCount}
            onChange={(event) => setAssetCount(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {slots > 0
              ? `Buys ${slots} asset slot${slots === 1 ? '' : 's'} now at the plan's rate and issues an invoice. The organization can then onboard up to ${slots} vehicle${slots === 1 ? '' : 's'}.`
              : 'Leave at 0 to assign the plan without charging anything. Capacity has to be purchased before the first vehicle can be onboarded.'}
          </p>
        </div>
      )}

      <Button
        type="submit"
        disabled={
          mutation.isPending
          || !planId
          || (!isAssign && planId === String(currentPlanId ?? ''))
        }
      >
        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {mutation.isPending
          ? (isAssign ? 'Assigning…' : 'Changing…')
          : !isAssign ? 'Change Plan'
          : hasAssets || slots > 0 ? 'Assign Plan & Invoice'
          : 'Assign Plan'}
      </Button>
    </form>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function OrgDetailView({ id }: { id: string }) {
  const superAdmin = useAuthStore(s => s.user?.role === 'super_admin')
  const canManage = usePermission('admin.organizations.manage')
  const canSuspend = usePermission('admin.organizations.suspend')
  const canDelete = usePermission('admin.organizations.delete')
  const canBill = usePermission('admin.billing.money')
  const canAudit = usePermission('admin.audit.view')
  const canDevices = usePermission('admin.devices.view')
  const router = useRouter()
  const qc = useQueryClient()

  const [editOpen, setEditOpen]       = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [deleteOpen, setDeleteOpen]   = useState(false)
  const [planOpen, setPlanOpen]       = useState(false)

  const { data: org, isLoading, error, refetch } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => getOrganization(id),
    staleTime: 30_000,
  })

  const suspendMutation = useMutation({
    mutationFn: () =>
      org?.status === 'suspended' ? unsuspendOrganization(id) : suspendOrganization(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization', id] })
      qc.invalidateQueries({ queryKey: ['organizations'] })
      toast.success(org?.status === 'suspended' ? 'Organization reactivated' : 'Organization suspended')
      setSuspendOpen(false)
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Action failed. Please try again.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrganization(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      toast.success('Organization deleted')
      router.replace('/organizations')
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to delete organization')
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) return <QueryError error={error} retry={() => void refetch()} label="this organization" />

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">Organization not found.</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const isSuspended = org.status === 'suspended'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/organizations')} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={org.name}
          description={org.identifier ?? org.slug ?? undefined}
          icon={Building2}
          className="pb-0"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!canManage} onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="outline" size="sm" disabled={!canSuspend} onClick={() => setSuspendOpen(true)}>
                {isSuspended
                  ? <><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Reactivate</>
                  : <><ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Suspend</>
                }
              </Button>
              <Button variant="destructive" size="sm" disabled={!canDelete} onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          }
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="max-w-full flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          {canAudit && <TabsTrigger value="activity">Audit activity</TabsTrigger>}
          {superAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          {superAdmin && <TabsTrigger value="vehicles">Vehicles</TabsTrigger>}
          {canDevices && <TabsTrigger value="devices">Devices</TabsTrigger>}
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left: profile + stats */}
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 pb-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary uppercase">
                    {org.name?.[0] ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold leading-tight text-foreground">{org.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={org.current_plan?.status ?? org.status} />
                      {(org.current_plan?.plan?.name ?? org.subscription_plan) && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {org.current_plan?.plan?.name ?? org.subscription_plan}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <Separator />

                <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
                  <InfoRow icon={Building2} label="Business Email"  value={org.email} />

                  <InfoRow icon={Phone}     label="Phone"           value={org.phone} />
                  <InfoRow icon={Briefcase} label="Industry"        value={org.industry} />
                  <InfoRow icon={Mail}      label="Fleet Size"     value={org.fleet_size} />
                  <InfoRow icon={MapPin}    label="Address"         value={org.address} />
                  <InfoRow icon={Calendar}  label="Joined"
                    value={org.joined_date ?? org.created_at
                      ? format(new Date((org.joined_date ?? org.created_at)!), 'MMM d, yyyy')
                      : undefined
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Fleet Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 min-[420px]:grid-cols-2 sm:grid-cols-4">
                    <StatCard label="Vehicles"      value={org.total_vehicles ?? org.vehicle_count ?? org.fleet_size} />
                    <StatCard label="Vehicle Limit" value={!org.current_plan?.plan ? 'Unavailable' : org.current_plan.plan.vehicle_limit === null ? 'Unlimited' : org.current_plan.plan.vehicle_limit} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: owner + actions */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Owner</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground uppercase">
                      {org.owner_name?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{org.owner_name ?? '—'}</p>
                      <p className="truncate text-xs text-muted-foreground">{org.owner_email ?? '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm" disabled={!canManage} onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    disabled={!canBill} onClick={() => setPlanOpen(true)}
                  >
                    <CreditCard className="mr-2 h-3.5 w-3.5" />
                    {org.current_plan?.id ? 'Change Plan' : 'Assign Plan'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => setSuspendOpen(true)}
                    disabled={!canSuspend || suspendMutation.isPending}
                  >
                    {suspendMutation.isPending
                      ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      : isSuspended
                      ? <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                      : <ShieldOff className="mr-2 h-3.5 w-3.5" />
                    }
                    {isSuspended ? 'Reactivate' : 'Suspend'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    size="sm"
                    disabled={!canDelete} onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Organization
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Performance ── */}
        <TabsContent value="performance" className="mt-4">
          <OrgPerformanceTab identifier={org.identifier ?? org.slug ?? id} />
        </TabsContent>

        {/* ── Activity ── */}
        {canAudit && <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <OrgActivityTab identifier={org.identifier ?? org.slug ?? id} />
            </CardContent>
          </Card>
        </TabsContent>}
        {superAdmin && <TabsContent value="users" className="mt-4"><OrgRelations organizationId={org.id} kind="users" /></TabsContent>}
        {superAdmin && <TabsContent value="vehicles" className="mt-4"><OrgRelations organizationId={org.id} kind="vehicles" /></TabsContent>}
        {canDevices && <TabsContent value="devices" className="mt-4"><OrgRelations organizationId={org.id} kind="devices" /></TabsContent>}
        </Tabs>

      {/* Edit slide-over */}
      <OrgFormSlideOver open={canManage && editOpen} onOpenChange={setEditOpen} org={org} />

      {/* Change plan slide-over */}
      <SlideOver
        open={canBill && planOpen}
        onOpenChange={setPlanOpen}
        title={org.current_plan?.id ? 'Change Plan' : 'Assign Plan'}
        description={`${org.name} · admins may assign hidden or custom plans`}
        width="md"
      >
        {canBill && planOpen && (
          <ChangePlanPanel
            organizationIdentifier={org.identifier ?? org.id}
            subscriptionId={org.current_plan?.id}
            currentPlanId={org.current_plan?.plan?.id}
            currentPlanName={org.current_plan?.plan?.name}
            billingCycle={org.current_plan?.billing_cycle as 'monthly' | 'yearly' | undefined}
            vehicleCount={org.total_vehicles ?? org.vehicle_count}
            onDone={() => setPlanOpen(false)}
          />
        )}
      </SlideOver>

      {/* Suspend confirm */}
      <ConfirmDialog
        open={canSuspend && suspendOpen}
        onOpenChange={setSuspendOpen}
        title={isSuspended ? 'Reactivate Organization' : 'Suspend Organization'}
        description={
          isSuspended
            ? `Reactivate "${org.name}"? They will regain access immediately.`
            : `Suspend "${org.name}"? Their access will be blocked until reactivated.`
        }
        confirmLabel={isSuspended ? 'Reactivate' : 'Suspend'}
        variant={isSuspended ? 'default' : 'destructive'}
        onConfirm={() => suspendMutation.mutateAsync()}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={canDelete && deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Organization"
        description={`Permanently delete "${org.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync()}
      />
    </div>
  )
}
