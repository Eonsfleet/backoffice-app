'use client'
import { useAuthStore } from '@/stores/auth.store'
import { useSearchParams } from 'next/navigation'
import { useUrlListState } from '@/hooks/useUrlListState'
import { useDebounce } from '@/hooks/useDebounce'


import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Cpu, Search, MoreHorizontal, Eye, PowerOff, Download, Upload,
  Wifi, WifiOff, CircleDashed, Plus, Pencil, Trash2,
  CircuitBoard, CheckCircle2, XCircle, Signal,
} from 'lucide-react'

import { PageHeader }    from '@/components/shared/PageHeader'
import { DataTable }     from '@/components/shared/DataTable'
import { BulkRecordsTable } from '@/components/shared/BulkRecordsTable'
import { bulkDeleteDevices } from '@/features/devices/api'
import { StatusBadge }   from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SlideOver }     from '@/components/shared/SlideOver'
import { Button }        from '@/components/ui/button'
import { Input }         from '@/components/ui/input'
import { Badge }         from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'

import {
  listDevices, deactivateDevice, deleteDevice, exportDevices,
  listHardware, createHardware, updateHardware, deleteHardware,
  listApns, createApn, updateApn, deleteApn,
} from '@/features/devices/api'
import { listOrganizations } from '@/features/organizations/api'
import { DeviceCreateForm } from '@/features/devices/components/DeviceCreateForm'
import { DeviceEditForm } from '@/features/devices/components/DeviceEditForm'
import { DeviceImportForm } from '@/features/devices/components/DeviceImportForm'
import { HardwareForm, type HardwareFormValues } from '@/features/devices/components/HardwareForm'
import { ApnForm, type ApnFormValues } from '@/features/devices/components/ApnForm'
import type { Apn, Device, Hardware } from '@/types/api'

const STATUS_OPTIONS = [
  { value: 'all',        label: 'All Statuses' },
  { value: 'online',     label: 'Online' },
  { value: 'offline',    label: 'Offline' },
  { value: 'unassigned', label: 'Unassigned' },
]

const DEVICE_EXPORT_STATUS_OPTIONS = [
  { value: 'all',         label: 'All Statuses' },
  { value: 'active',      label: 'Active' },
  { value: 'inactive',    label: 'Inactive' },
  { value: 'deactivated', label: 'Disabled' },
  { value: 'online',      label: 'Online' },
  { value: 'offline',     label: 'Offline' },
  { value: 'unassigned',  label: 'Unassigned' },
]

const PER_PAGE = 15

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: Device['status'] }) {
  if (status === 'online')  return <Wifi className="h-3.5 w-3.5 text-emerald-500" />
  if (status === 'offline') return <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
  return <CircleDashed className="h-3.5 w-3.5 text-blue-500" />
}

// ─── Devices Tab ──────────────────────────────────────────────────────────────

function DevicesTab() {
  const canManage = useAuthStore(s => s.user?.role === 'super_admin')
  const router = useRouter()
  const qc = useQueryClient()

  const { search, status, page, setSearch, setStatus, setPage } = useUrlListState()
  const debouncedSearch = useDebounce(search, 300)
  const [createOpen, setCreateOpen]             = useState(false)
  const [importOpen, setImportOpen]             = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<Device | null>(null)
  const [deleteDeviceTarget, setDeleteDeviceTarget] = useState<Device | null>(null)
  const [editDeviceTarget, setEditDeviceTarget]     = useState<Device | null>(null)
  const [exporting, setExporting]               = useState(false)
  const [exportOpen, setExportOpen]             = useState(false)
  const [exportOrgId, setExportOrgId]           = useState('all')
  const [exportStatus, setExportStatus]         = useState('all')

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['devices', { search: debouncedSearch, status, page }],
    queryFn: () => listDevices({
      q:        debouncedSearch || undefined,
      status:   status === 'all' ? undefined : status,
      page,
      per_page: PER_PAGE,
    }),
    staleTime: 30_000,
  })

  const { data: orgsData } = useQuery({
    queryKey: ['orgs-dropdown'],
    enabled: canManage,
    queryFn: () => listOrganizations({ per_page: 100 }),
    staleTime: 120_000,
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string | number) => deactivateDevice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      toast.success('Device deactivated')
      setDeactivateTarget(null)
    },
    onError: () => toast.error('Failed to deactivate device'),
  })

  const deleteDeviceMutation = useMutation({
    mutationFn: (id: string | number) => deleteDevice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['device-metrics'] })
      toast.success('Device deleted')
      setDeleteDeviceTarget(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to delete device')
    },
  })

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      await exportDevices({
        q: search || undefined,
        status: exportStatus === 'all' ? undefined : exportStatus,
        organization_id: exportOrgId === 'all' ? undefined : exportOrgId,
      })
      setExportOpen(false)
      toast.success('Export started — file will download shortly')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }, [exportOrgId, exportStatus, search])

  const columns: ColumnDef<Device, unknown>[] = [
    {
      id: 'imei',
      header: 'Device',
      cell: ({ row }) => {
        const d = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <StatusIcon status={d.status} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-medium text-foreground">{d.device_id}</p>
              {d.phone_number && (
                <p className="text-xs text-muted-foreground">{d.phone_number}</p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: 'hardware',
      header: 'Hardware',
      cell: ({ row }) => <span className="text-sm">{row.original.hardware?.name ?? '—'}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'connectivity',
      header: 'Connectivity',
      cell: ({ row }) => {
        const online = row.original.is_online
        if (online === undefined || online === null) return <span className="text-xs text-muted-foreground">—</span>
        return online ? (
          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
            <Wifi className="h-3 w-3" /> Online
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <WifiOff className="h-3 w-3" /> Offline
          </Badge>
        )
      },
    },
    {
      id: 'organization',
      header: 'Organization',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.organization?.name ?? <span className="text-muted-foreground">Unassigned</span>}
        </span>
      ),
    },
    {
      id: 'vehicle',
      header: 'Vehicle',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.vehicle?.plate_number ?? <span className="text-muted-foreground font-sans">—</span>}
        </span>
      ),
    },
    {
      id: 'last_seen',
      header: 'Last Seen',
      cell: ({ row }) => {
        const ls = row.original.last_packet_received_at
        return (
          <span className="text-sm text-muted-foreground">
            {ls ? formatDistanceToNow(new Date(ls), { addSuffix: true }) : '—'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const d = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => router.push(`/devices/${d.id}`)}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canManage} onClick={() => setEditDeviceTarget(d)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={!canManage} onClick={() => setDeactivateTarget(d)}
              >
                <PowerOff className="mr-2 h-4 w-4" /> Deactivate
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={!canManage} onClick={() => setDeleteDeviceTarget(d)}
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
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex w-full flex-wrap items-center gap-2">
        <div className="relative min-w-full flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search IMEI or serial…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setExportOpen(true)} disabled={exporting || !canManage}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
        <Button variant="outline" disabled={!canManage} onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
        <Button disabled={!canManage} onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Device
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <BulkRecordsTable
        selectionScope={JSON.stringify({ page, search: debouncedSearch, status })}
        actions={canManage ? [{ label: 'Delete selected devices', description: 'Remove the selected devices from the fleet using soft deletion. Their historical records are retained.', run: bulkDeleteDevices }] : []}
        invalidateKeys={['devices', 'device-metrics', 'vehicles']}
        isFetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        toolbar={toolbar}
        pagination={{ pageIndex: page - 1, pageSize: PER_PAGE }}
        pageCount={data?.meta?.last_page ?? 1}
        onPaginationChange={(s) => setPage(s.pageIndex + 1)}
      />

      <SlideOver open={createOpen} onOpenChange={setCreateOpen} title="Add Device" description="Register a new GPS tracking device.">
        <DeviceCreateForm onSuccess={() => setCreateOpen(false)} onCancel={() => setCreateOpen(false)} />
      </SlideOver>

      <SlideOver
        open={!!editDeviceTarget}
        onOpenChange={(o) => !o && setEditDeviceTarget(null)}
        title="Edit Device"
        description={editDeviceTarget ? `Update details for ${editDeviceTarget.device_id}.` : undefined}
      >
        {editDeviceTarget && (
          <DeviceEditForm
            key={editDeviceTarget.id}
            device={editDeviceTarget}
            onSuccess={() => setEditDeviceTarget(null)}
            onCancel={() => setEditDeviceTarget(null)}
          />
        )}
      </SlideOver>

      <SlideOver open={importOpen} onOpenChange={setImportOpen} title="Import Devices" description="Upload a CSV or Excel file to bulk-add devices. Select the organization first, then upload.">
        <DeviceImportForm onSuccess={() => setImportOpen(false)} onCancel={() => setImportOpen(false)} />
      </SlideOver>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Export Devices</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Organization</Label>
              <SearchableSelect
                options={[
                  { value: 'all', label: 'All Organizations' },
                  ...(orgsData?.data ?? []).map((org) => ({
                    value: String(org.identifier ?? org.id),
                    label: org.name,
                  })),
                ]}
                value={exportOrgId}
                onValueChange={setExportOrgId}
                placeholder="All Organizations"
                searchPlaceholder="Search organizations..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={exportStatus} onValueChange={setExportStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEVICE_EXPORT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Exporting…' : 'Download CSV'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deactivateTarget && (
        <ConfirmDialog
          open={!!deactivateTarget}
          onOpenChange={(o) => !o && setDeactivateTarget(null)}
          title="Deactivate Device"
          description={`Deactivate device ${deactivateTarget.device_id}? It will stop reporting until reactivated.`}
          confirmLabel="Deactivate"
          variant="destructive"
          onConfirm={() => deactivateMutation.mutateAsync(deactivateTarget.id)}
        />
      )}

      {deleteDeviceTarget && (
        <ConfirmDialog
          open={!!deleteDeviceTarget}
          onOpenChange={(o) => !o && setDeleteDeviceTarget(null)}
          title="Delete Device"
          description={
            `Delete device ${deleteDeviceTarget.device_id}? It will be removed from the fleet and ` +
            'unassigned from any vehicle. Deactivate instead if you only want it to stop reporting.'
          }
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteDeviceMutation.mutateAsync(deleteDeviceTarget.id)}
        />
      )}
    </div>
  )
}

// ─── Hardware Tab ─────────────────────────────────────────────────────────────

function HardwareTab() {
  const qc = useQueryClient()

  const urlFilters = useSearchParams()
  const [search, setSearch] = useState(urlFilters.get('q') ?? '')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage]     = useState(1)

  const [formOpen, setFormOpen]         = useState(false)
  const [editTarget, setEditTarget]     = useState<Hardware | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Hardware | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['hardware', { search: debouncedSearch, page }],
    queryFn: () => listHardware({ q: debouncedSearch || undefined, per_page: PER_PAGE, page }),
    staleTime: 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: (v: HardwareFormValues) =>
      editTarget
        ? updateHardware(editTarget.id, v)
        : createHardware(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware'] })
      qc.invalidateQueries({ queryKey: ['hardware-list'] })
      toast.success(editTarget ? 'Hardware updated' : 'Hardware created')
      setFormOpen(false)
      setEditTarget(null)
    },
    onError: () => toast.error('Failed to save hardware'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteHardware(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware'] })
      qc.invalidateQueries({ queryKey: ['hardware-list'] })
      toast.success('Hardware deleted')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Failed to delete hardware'),
  })

  const openCreate = () => { setEditTarget(null); setFormOpen(true) }
  const openEdit   = (h: Hardware) => { setEditTarget(h); setFormOpen(true) }

  const columns: ColumnDef<Hardware, unknown>[] = [
    {
      id: 'name',
      header: 'Hardware Model',
      cell: ({ row }) => {
        const h = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
              <CircuitBoard className="h-4 w-4 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{h.name}</p>
              {h.slug && <p className="truncate text-xs text-muted-foreground font-mono">{h.slug}</p>}
            </div>
          </div>
        )
      },
    },
    {
      id: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {row.original.description ?? '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.original.status !== false
        return active
          ? (
            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-3 w-3" /> Active
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <XCircle className="h-3 w-3" /> Inactive
            </Badge>
          )
      },
    },
    {
      id: 'created_at',
      header: 'Added',
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
        const h = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => openEdit(h)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(h)}
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
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="relative min-w-full flex-1 sm:min-w-[200px] sm:max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search hardware models…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-8"
        />
      </div>
      <Button onClick={openCreate}>
        <Plus className="mr-2 h-4 w-4" /> Add Hardware
      </Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <DataTable
        error={error}
        onRetry={() => void refetch()}
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        toolbar={toolbar}
        pagination={{ pageIndex: page - 1, pageSize: PER_PAGE }}
        pageCount={data?.meta?.last_page ?? 1}
        onPaginationChange={(s) => setPage(s.pageIndex + 1)}
      />

      <SlideOver
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditTarget(null) }}
        title={editTarget ? 'Edit Hardware' : 'Add Hardware'}
        description={editTarget ? 'Update hardware model details.' : 'Register a new GPS hardware model.'}
      >
        <HardwareForm
          hardware={editTarget}
          onSubmit={(v) => saveMutation.mutate(v)}
          isPending={saveMutation.isPending}
          onCancel={() => setFormOpen(false)}
        />
      </SlideOver>

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="Delete Hardware"
          description={`Permanently delete "${deleteTarget.name}"? Devices using this model will lose their hardware reference.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(deleteTarget.id)}
        />
      )}
    </div>
  )
}

// ─── APN Tab ──────────────────────────────────────────────────────────────────

function ApnTab() {
  const qc = useQueryClient()

  const urlFilters = useSearchParams()
  const [search, setSearch]         = useState(urlFilters.get('q') ?? '')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage]             = useState(1)
  const [formOpen, setFormOpen]     = useState(false)
  const [editTarget, setEditTarget] = useState<Apn | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Apn | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['apns', { search: debouncedSearch, page }],
    queryFn: () => listApns({ q: debouncedSearch || undefined, per_page: PER_PAGE, page }),
    staleTime: 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: (v: ApnFormValues) =>
      editTarget ? updateApn(editTarget.id, v) : createApn(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['apns'] })
      toast.success(editTarget ? 'APN updated' : 'APN created')
      setFormOpen(false)
      setEditTarget(null)
    },
    onError: () => toast.error('Failed to save APN'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteApn(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['apns'] })
      toast.success('APN deleted')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Failed to delete APN'),
  })

  const openCreate = () => { setEditTarget(null); setFormOpen(true) }
  const openEdit   = (a: Apn) => { setEditTarget(a); setFormOpen(true) }

  const columns: ColumnDef<Apn, unknown>[] = [
    {
      id: 'name',
      header: 'APN Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
            <Signal className="h-4 w-4 text-sky-600" />
          </div>
          <p className="truncate text-sm font-medium text-foreground">{row.original.name}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        row.original.status === 1 ? (
          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-3 w-3" /> Active
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <XCircle className="h-3 w-3" /> Inactive
          </Badge>
        ),
    },
    {
      id: 'created_at',
      header: 'Added',
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
        const a = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => openEdit(a)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(a)}
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
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="relative min-w-full flex-1 sm:min-w-[200px] sm:max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search APNs…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-8"
        />
      </div>
      <Button onClick={openCreate}>
        <Plus className="mr-2 h-4 w-4" /> Add APN
      </Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <DataTable
        error={error}
        onRetry={() => void refetch()}
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        toolbar={toolbar}
        pagination={{ pageIndex: page - 1, pageSize: PER_PAGE }}
        pageCount={data?.meta?.last_page ?? 1}
        onPaginationChange={(s) => setPage(s.pageIndex + 1)}
      />

      <SlideOver
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditTarget(null) }}
        title={editTarget ? 'Edit APN' : 'Add APN'}
        description={editTarget ? 'Update APN details.' : 'Add a new APN configuration.'}
      >
        <ApnForm
          apn={editTarget}
          onSubmit={(v) => saveMutation.mutate(v)}
          isPending={saveMutation.isPending}
          onCancel={() => setFormOpen(false)}
        />
      </SlideOver>

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="Delete APN"
          description={`Permanently delete "${deleteTarget.name}"?`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(deleteTarget.id)}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevicesPage() {
  const canManage = useAuthStore(s => s.user?.role === 'super_admin')
  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        description="Manage GPS tracking devices and hardware models"
        icon={Cpu}
      />

      <Tabs defaultValue="devices">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
          <TabsTrigger
            value="devices"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-1 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent"
          >
            <Cpu className="mr-2 h-4 w-4" />
            Devices
          </TabsTrigger>
          <TabsTrigger
            value="hardware"
            disabled={!canManage}
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-1 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent"
          >
            <CircuitBoard className="mr-2 h-4 w-4" />
            Hardware
          </TabsTrigger>
          <TabsTrigger
            value="apn"
            disabled={!canManage}
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-1 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent"
          >
            <Signal className="mr-2 h-4 w-4" />
            APN
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="mt-6">
          <DevicesTab />
        </TabsContent>

        <TabsContent value="hardware" className="mt-6">
          {canManage && <HardwareTab />}
        </TabsContent>

        <TabsContent value="apn" className="mt-6">
          {canManage && <ApnTab />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
