'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Building2, Plus, Search, MoreHorizontal, Eye, Pencil, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { OrgFormSlideOver } from '@/features/organizations/components/OrgFormSlideOver'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { Organization } from '@/types/api'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

const STATUS_OPTIONS = [
  { value: 'all',        label: 'All Statuses' },
  { value: 'active',     label: 'Active' },
  { value: 'grace',      label: 'Grace' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'suspended',  label: 'Suspended' },
]

export default function OrganizationsPage() {
  const router = useRouter()
  const qc = useQueryClient()

  // Filters & pagination
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('all')
  const [page, setPage]       = useState(1)
  const perPage               = DEFAULT_PAGE_SIZE

  // UI state
  const [formOpen, setFormOpen]         = useState(false)
  const [editOrg, setEditOrg]           = useState<Organization | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<Organization | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<Organization | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['organizations', { search, status, page, perPage }],
    queryFn: () => listOrganizations({
      q: search || undefined,
      status: status === 'all' ? undefined : status,
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
    onError: () => toast.error('Action failed. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteOrganization(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      toast.success('Organization deleted')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Failed to delete organization'),
  })

  const openCreate = useCallback(() => { setEditOrg(null); setFormOpen(true) }, [])
  const openEdit   = useCallback((org: Organization) => { setEditOrg(org); setFormOpen(true) }, [])

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
              <p className="truncate font-medium text-foreground">{org.name}</p>
              {org.identifier && (
                <p className="text-xs text-muted-foreground">{org.identifier}</p>
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
        const status = row.original.current_plan?.status ?? row.original.status
        return <StatusBadge status={status} />
      },
    },
    {
      id: 'plan',
      header: 'Plan',
      cell: ({ row }) => {
        const plan = row.original.current_plan?.plan?.name ?? row.original.subscription_plan
        return <span className="text-sm">{plan ?? <span className="text-muted-foreground">—</span>}</span>
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
            {date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '—'}
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
              <DropdownMenuItem onClick={() => openEdit(org)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSuspendTarget(org)}>
                {isSuspended
                  ? <><ShieldCheck className="mr-2 h-4 w-4" /> Reactivate</>
                  : <><ShieldOff className="mr-2 h-4 w-4" /> Suspend</>
                }
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(org)}
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
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search organizations…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-8"
        />
      </div>
      <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description={data?.meta?.total != null ? `${data.meta.total} organizations` : 'Manage fleet organizations'}
        icon={Building2}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Organization
          </Button>
        }
      />

      <DataTable
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
      <OrgFormSlideOver
        open={formOpen}
        onOpenChange={setFormOpen}
        org={editOrg}
      />

      {/* Suspend / Reactivate confirm */}
      {suspendTarget && (
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
      {deleteTarget && (
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
