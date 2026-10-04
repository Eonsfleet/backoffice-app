'use client'
import { usePermission } from '@/hooks/usePermission'

import { useUrlListState } from '@/hooks/useUrlListState'
import { FilterBar } from '@/components/shared/FilterBar'
import { Timestamp } from '@/components/shared/Timestamp'
import { useDebounce } from '@/hooks/useDebounce'


import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Building2, Plus, MoreHorizontal, Eye, Pencil, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { OrgFormSlideOver } from '@/features/organizations/components/OrgFormSlideOver'
import { OrgStatusSlideOver } from '@/features/organizations/components/OrgStatusSlideOver'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  listOrganizations,
  suspendOrganization,
  unsuspendOrganization,
  deleteOrganization,
} from '@/features/organizations/api'
import { ONBOARDING_SOURCE_LABELS, onboardingSourceLabel, trialSummary } from '@/features/organizations/onboarding'
import type { OnboardingSource, Organization } from '@/types/api'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

// Only these values filter anything server-side: `active`/`inactive`/`suspended`
// resolve against the statuses table (OrganizationRepository → HasFilters), and
// `expired`/`cancelled` are matched against the subscription status. Slugs like
// trial/grace/restricted have no organization status row, so Status::getId()
// returned null and the list came back silently empty.
const STATUS_OPTIONS = [
  { value: 'all',       label: 'All Statuses' },
  { value: 'active',    label: 'Active' },
  { value: 'inactive',  label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired',   label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
]

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  ...Object.entries(ONBOARDING_SOURCE_LABELS).map(([value, label]) => ({ value, label })),
]

export default function OrganizationsPage() {
  const canManage = usePermission('admin.organizations.manage')
  const canSuspend = usePermission('admin.organizations.suspend')
  const canDelete = usePermission('admin.organizations.delete')
  const router = useRouter()
  const qc = useQueryClient()

  // Filters & pagination
  const { search, status, page, setSearch, setStatus, setPage, reset, getFilter, setFilter } = useUrlListState()
  const source = getFilter('source')
  const setSource = (value: string) => setFilter('source', value)
  const debouncedSearch = useDebounce(search, 300)
  const perPage               = DEFAULT_PAGE_SIZE

  // UI state
  const [formOpen, setFormOpen]         = useState(false)
  const [editOrg, setEditOrg]           = useState<Organization | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<Organization | null>(null)
  const [statusTarget, setStatusTarget] = useState<Organization | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<Organization | null>(null)

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['organizations', { search: debouncedSearch, status, source, page, perPage }],
    queryFn: () => listOrganizations({
      q: debouncedSearch || undefined,
      status: status === 'all' ? undefined : status,
      onboarding_source: source === 'all' ? undefined : source as OnboardingSource,
      page,
      per_page: perPage,
    }),
    staleTime: 30_000,
  })

  const suspendMutation = useMutation({
    mutationFn: (org: Organization) =>
      org.status === 'suspended' ? unsuspendOrganization(org.id) : suspendOrganization(org.id),
    onSuccess: (_, org) => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      toast.success(org.status === 'suspended' ? 'Organization reactivated' : 'Organization suspended')
      setSuspendTarget(null)
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Action failed. Please try again.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteOrganization(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      toast.success('Organization deleted')
      setDeleteTarget(null)
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to delete organization')
    },
  })

  const openCreate = () => { setEditOrg(null); setFormOpen(true) }
  const openEdit   = (org: Organization) => { setEditOrg(org); setFormOpen(true) }

  const columns: ColumnDef<Organization, unknown>[] = [
    {
      id: 'name',
      header: 'Organization',
      cell: ({ row }) => {
        const org = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary uppercase">
              {org.name?.[0] ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="max-w-72 whitespace-normal break-words font-medium text-foreground">{org.name}</p>
              {(org.identifier || org.onboarding_source) && (
                <p className="text-xs text-muted-foreground">
                  {[org.identifier, onboardingSourceLabel(org.onboarding_source)].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: 'owner',
      header: 'Owner',
      cell: ({ row }) => {
        const org = row.original
        return (
          <div className="min-w-0">
            <p className="truncate text-sm">{org.owner_name ?? '—'}</p>
            <p className="truncate text-xs text-muted-foreground">{org.owner_email ?? org.email ?? '—'}</p>
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status ?? 'Not set'
        return <StatusBadge status={status} />
      },
    },
    {
      id: 'plan',
      header: 'Plan',
      cell: ({ row }) => {
        const plan = row.original.current_plan?.plan?.name ?? row.original.subscription_plan
        const trial = trialSummary(row.original.current_plan)
        return (
          <div className="text-sm">
            {plan ?? <span className="text-muted-foreground">—</span>}
            {trial && <p className="text-xs text-amber-600 dark:text-amber-400">{trial}</p>}
          </div>
        )
      },
    },
    {
      id: 'fleet',
      header: 'Fleet',
      cell: ({ row }) => {
        const org = row.original
        const count = org.total_vehicles ?? org.vehicle_count ?? org.fleet_size ?? 0
        const limit = org.current_plan?.plan?.vehicle_limit ?? org.vehicle_limit
        return (
          <span className="text-sm tabular-nums">
            {count}{limit ? `/${limit}` : ''} vehicles
          </span>
        )
      },
    },
    {
      id: 'joined',
      header: 'Joined',
      cell: ({ row }) => {
        const date = row.original.joined_date ?? row.original.created_at
        return (
          <span className="text-sm text-muted-foreground">
            <Timestamp value={date} />
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const org = row.original
        const isSuspended = org.status === 'suspended'
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => router.push(`/organizations/${org.id}`)}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canManage} onClick={() => openEdit(org)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!canSuspend} onClick={() => setStatusTarget(org)}>Change status</DropdownMenuItem>
              <DropdownMenuItem disabled={!canSuspend} onClick={() => setSuspendTarget(org)}>
                {isSuspended
                  ? <><ShieldCheck className="mr-2 h-4 w-4" /> Reactivate</>
                  : <><ShieldOff className="mr-2 h-4 w-4" /> Suspend</>
                }
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={!canDelete} onClick={() => setDeleteTarget(org)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const orgs      = data?.data ?? []
  const pageCount = data?.meta?.last_page ?? 1

  const toolbar = (
    <FilterBar
      search={search} onSearchChange={setSearch} searchLabel="Search organizations" placeholder="Organization name or identifier" onReset={reset}
      filters={[
        ...(status !== 'all' ? [{ key: 'status', label: `Status: ${status}`, onRemove: () => setStatus('all') }] : []),
        ...(source !== 'all' ? [{ key: 'source', label: `Source: ${onboardingSourceLabel(source as OnboardingSource)}`, onRemove: () => setSource('all') }] : []),
      ]}
    >
      <div><label id="organization-status-label" className="mb-1.5 block text-xs font-medium">Status</label>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger aria-labelledby="organization-status-label" className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select></div>
      <div><label id="organization-source-label" className="mb-1.5 block text-xs font-medium">Onboarding source</label>
      <Select value={source} onValueChange={setSource}>
        <SelectTrigger aria-labelledby="organization-source-label" className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>{SOURCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select></div>
    </FilterBar>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description={data?.meta?.total != null ? `${data.meta.total} organizations` : 'Manage fleet organizations'}
        icon={Building2}
        actions={
          <Button disabled={!canManage} onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Organization
          </Button>
        }
      />

      <DataTable
        error={error}
        onRetry={() => void refetch()}
        data={orgs}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        toolbar={toolbar}
        pagination={{ pageIndex: page - 1, pageSize: perPage }}
        pageCount={pageCount}
        onPaginationChange={(s) => setPage(s.pageIndex + 1)}
      />

      {/* Create / Edit slide-over */}
      <OrgStatusSlideOver org={statusTarget} open={canSuspend && !!statusTarget} onOpenChange={open => { if (!open) setStatusTarget(null) }} />
      {canManage && <OrgFormSlideOver
        open={formOpen}
        onOpenChange={setFormOpen}
        org={editOrg}
      />}

      {/* Suspend / Reactivate confirm */}
      {canSuspend && suspendTarget && (
        <ConfirmDialog
          open={!!suspendTarget}
          onOpenChange={(o) => !o && setSuspendTarget(null)}
          title={suspendTarget.status === 'suspended' ? 'Reactivate Organization' : 'Suspend Organization'}
          description={
            suspendTarget.status === 'suspended'
              ? `Reactivate "${suspendTarget.name}"? They will regain access immediately.`
              : `Suspend "${suspendTarget.name}"? Their access will be blocked until reactivated.`
          }
          confirmLabel={suspendTarget.status === 'suspended' ? 'Reactivate' : 'Suspend'}
          variant={suspendTarget.status === 'suspended' ? 'default' : 'destructive'}
          onConfirm={() => suspendMutation.mutateAsync(suspendTarget)}
        />
      )}

      {/* Delete confirm */}
      {canDelete && deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="Delete Organization"
          description={`Permanently delete "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(deleteTarget.id)}
        />
      )}
    </div>
  )
}
