'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  Truck, Search, MoreHorizontal, Pencil, Trash2,
  Plus, Cpu, Link2Off, Wifi, WifiOff, CircleDashed,
  Car, ShieldCheck, TrendingUp,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SlideOver } from '@/components/shared/SlideOver'
import { KpiCard } from '@/components/shared/KpiCard'
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
  listVehicles, getVehicleMetrics, createVehicle, updateVehicle,
  deleteVehicle, unassignDeviceFromVehicle,
} from '@/features/vehicles/api'
import { listOrganizations } from '@/features/organizations/api'
import { VehicleFormFields } from '@/features/vehicles/components/VehicleFormFields'
import { AssignDeviceForm } from '@/features/vehicles/components/AssignDeviceForm'
import type { Vehicle } from '@/types/api'

// ─── Device status icon ───────────────────────────────────────────────────────

function DeviceStatusIcon({ status }: { status?: string | null }) {
  if (!status) return <CircleDashed className="h-3.5 w-3.5 text-muted-foreground/40" />
  if (status === 'online')  return <Wifi className="h-3.5 w-3.5 text-emerald-500" />
  if (status === 'offline') return <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
  return <CircleDashed className="h-3.5 w-3.5 text-blue-500" />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'all',         label: 'All Statuses' },
  { value: 'active',      label: 'Active' },
  { value: 'inactive',    label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
]

export default function VehiclesPage() {
  const qc = useQueryClient()

  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [page, setPage]         = useState(1)
  const perPage                 = 15

  const [createOpen, setCreateOpen]     = useState(false)
  const [editVehicle, setEditVehicle]   = useState<Vehicle | null>(null)
  const [assignTarget, setAssignTarget] = useState<Vehicle | null>(null)
  const [unassignTarget, setUnassignTarget] = useState<Vehicle | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', { search, status, orgFilter, page }],
    queryFn: () => listVehicles({
      q:               search || undefined,
      status:          status !== 'all' ? status : undefined,
      organization_id: orgFilter !== 'all' ? orgFilter : undefined,
      page,
      per_page:        perPage,
    }),
    staleTime: 30_000,
  })

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['vehicle-metrics'],
    queryFn: getVehicleMetrics,
    staleTime: 60_000,
  })

  const { data: orgsData } = useQuery({
    queryKey: ['orgs-dropdown'],
    queryFn: () => listOrganizations({ per_page: 100 }),
    staleTime: 120_000,
  })

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      toast.success('Vehicle created')
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['vehicle-metrics'] })
      setCreateOpen(false)
    },
    onError: () => toast.error('Failed to create vehicle'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<Parameters<typeof updateVehicle>[1]> }) =>
      updateVehicle(id, data),
    onSuccess: () => {
      toast.success('Vehicle updated')
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      setEditVehicle(null)
    },
    onError: () => toast.error('Failed to update vehicle'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      toast.success('Vehicle deleted')
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['vehicle-metrics'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('Failed to delete vehicle'),
  })

  const unassignMutation = useMutation({
    mutationFn: (id: string | number) => unassignDeviceFromVehicle(id),
    onSuccess: () => {
      toast.success('Device unassigned')
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['vehicle-metrics'] })
      setUnassignTarget(null)
    },
    onError: () => toast.error('Failed to unassign device'),
  })

  const columns: ColumnDef<Vehicle, unknown>[] = [
    {
      id: 'vehicle',
      header: 'Vehicle',
      cell: ({ row }) => {
        const v = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Truck className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono font-semibold text-foreground uppercase">{v.plate_number}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[v.make, v.model, v.year].filter(Boolean).join(' ') || '—'}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'organization',
      header: 'Organization',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.organization?.name ?? <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      id: 'driver',
      header: 'Driver',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.driver?.name ?? <span className="text-muted-foreground">Unassigned</span>}</span>
      ),
    },
    {
      id: 'device',
      header: 'Device',
      cell: ({ row }) => {
        const v = row.original
        if (!v.device_id) {
          return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><CircleDashed className="h-3.5 w-3.5" /> No device</span>
        }
        return (
          <div className="flex items-center gap-1.5">
            <DeviceStatusIcon status={v.device_status} />
            <span className="font-mono text-xs">{v.device_id}</span>
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'updated_at',
      header: 'Updated',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.updated_at ? format(new Date(row.original.updated_at), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const v = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditVehicle(v)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAssignTarget(v)}>
                <Cpu className="mr-2 h-4 w-4" />
                {v.device_id ? 'Reassign Device' : 'Assign Device'}
              </DropdownMenuItem>
              {v.device_id && (
                <DropdownMenuItem onClick={() => setUnassignTarget(v)}>
                  <Link2Off className="mr-2 h-4 w-4" /> Unassign Device
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(v)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search plate, make, model…"
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
      <Select value={orgFilter} onValueChange={(v) => { setOrgFilter(v); setPage(1) }}>
        <SelectTrigger className="w-44"><SelectValue placeholder="All Organizations" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Organizations</SelectItem>
          {orgsData?.data?.map((org) => (
            <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description={data?.meta?.total != null ? `${data.meta.total} vehicles across all organizations` : 'Platform-wide vehicle fleet'}
        icon={Truck}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Vehicle
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <KpiCard label="Total Vehicles"     value={metrics?.total}          icon={Truck}        isLoading={metricsLoading} />
        <KpiCard label="Active"             value={metrics?.active}         icon={ShieldCheck}  isLoading={metricsLoading} iconClassName="bg-emerald-500/10" />
        <KpiCard label="Maintenance"        value={metrics?.maintenance}    icon={Car}          isLoading={metricsLoading} iconClassName="bg-amber-500/10" />
        <KpiCard label="With Device"        value={metrics?.with_device}    icon={Cpu}          isLoading={metricsLoading} iconClassName="bg-blue-500/10" />
        <KpiCard label="Without Device"     value={metrics?.without_device} icon={CircleDashed} isLoading={metricsLoading} iconClassName="bg-muted" />
        <KpiCard label="Inactive"           value={metrics?.inactive}       icon={TrendingUp}   isLoading={metricsLoading} iconClassName="bg-red-500/10" />
      </div>

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        toolbar={toolbar}
        pagination={{ pageIndex: page - 1, pageSize: perPage }}
        pageCount={data?.meta?.last_page ?? 1}
        onPaginationChange={(s) => setPage(s.pageIndex + 1)}
      />

      {/* Create vehicle */}
      <SlideOver open={createOpen} onOpenChange={setCreateOpen} title="Add Vehicle" description="Register a new vehicle to an organization.">
        <VehicleFormFields
          onSubmit={(v) => createMutation.mutate({ ...v, organization_id: v.organization_id })}
          isPending={createMutation.isPending}
          onCancel={() => setCreateOpen(false)}
        />
      </SlideOver>

      {/* Edit vehicle */}
      <SlideOver
        open={!!editVehicle}
        onOpenChange={(o) => !o && setEditVehicle(null)}
        title="Edit Vehicle"
        description={editVehicle?.plate_number}
      >
        {editVehicle && (
          <VehicleFormFields
            vehicle={editVehicle}
            onSubmit={(v) => updateMutation.mutate({ id: editVehicle.id, data: v })}
            isPending={updateMutation.isPending}
            onCancel={() => setEditVehicle(null)}
          />
        )}
      </SlideOver>

      {/* Assign device */}
      <SlideOver
        open={!!assignTarget}
        onOpenChange={(o) => !o && setAssignTarget(null)}
        title="Assign Device"
        description={`Assign a tracker to ${assignTarget?.plate_number}`}
      >
        {assignTarget && (
          <AssignDeviceForm
            vehicle={assignTarget}
            onSuccess={() => setAssignTarget(null)}
            onCancel={() => setAssignTarget(null)}
          />
        )}
      </SlideOver>

      {/* Unassign device confirm */}
      {unassignTarget && (
        <ConfirmDialog
          open={!!unassignTarget}
          onOpenChange={(o) => !o && setUnassignTarget(null)}
          title="Unassign Device"
          description={`Remove device ${unassignTarget.device_id} from ${unassignTarget.plate_number}? The device will become unassigned.`}
          confirmLabel="Unassign"
          variant="destructive"
          onConfirm={() => unassignMutation.mutateAsync(unassignTarget.id)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="Delete Vehicle"
          description={`Permanently delete vehicle "${deleteTarget.plate_number}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(deleteTarget.id)}
        />
      )}
    </div>
  )
}
