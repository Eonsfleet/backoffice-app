'use client'
import { useUrlListState } from '@/hooks/useUrlListState'
import { useDebounce } from '@/hooks/useDebounce'


import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type ColumnDef } from '@tanstack/react-table'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Users, Search, MoreHorizontal, Eye, Pencil, Trash2,
  UserCheck, UserX, TrendingUp, Plus,
  KeyRound, Download, Upload,
} from 'lucide-react'

import { PageHeader }   from '@/components/shared/PageHeader'
import { DataTable }    from '@/components/shared/DataTable'
import { StatusBadge }  from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SlideOver }    from '@/components/shared/SlideOver'
import { KpiCard }      from '@/components/shared/KpiCard'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { Badge }        from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  listUsers, getUserMetrics, deactivateUser, activateUser, deleteUser,
  exportUsers, importUsers, downloadUserTemplate,
} from '@/features/users/api'
import { listOrganizations } from '@/features/organizations/api'
import { UserCreateForm } from '@/features/users/components/UserCreateForm'
import { UserEditForm }   from '@/features/users/components/UserEditForm'
import { UserDetail }     from '@/features/users/components/UserDetail'
import { ImportProgress } from '@/features/imports/components/ImportProgress'
import { ImportInstructions } from '@/features/imports/components/ImportInstructions'

import {
  listAdminUsers, createAdminUser, updateAdminUser,
  deleteAdminUser,
} from '@/features/admin-users/api'
import { listRoles } from '@/features/roles/api'
import { AdminUserForm, type AdminUserFormValues } from '@/features/admin-users/components/AdminUserForm'

import type { TenantUser, AdminUser } from '@/types/api'
import { getInitials } from '@/lib/string-utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'all',                label: 'All Statuses' },
  { value: 'active',             label: 'Active' },
  { value: 'inactive',           label: 'Inactive' },
  { value: 'pending_activation', label: 'Pending Activation' },
  { value: 'suspended',          label: 'Suspended' },
  { value: 'blocked',            label: 'Blocked' },
  { value: 'invite_sent',        label: 'Invite Sent' },
]

const USER_EXPORT_STATUS_OPTIONS = [
  { value: 'all',      label: 'All Statuses' },
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'blocked',  label: 'Disabled' },
]

const PER_PAGE = 15

// ─── Tenant Users Tab ─────────────────────────────────────────────────────────

function TenantUsersTab() {
  const qc = useQueryClient()

  const urlState = useUrlListState()
  const { search, status, page, setSearch, setStatus, setPage } = urlState
  const debouncedSearch = useDebounce(search, 300)
  const orgFilter = urlState.getFilter('organization')
  const setOrgFilter = (value: string) => urlState.setFilter('organization', value)

  const [createOpen, setCreateOpen] = useState(false)
  const [viewUser, setViewUser]     = useState<TenantUser | null>(null)
  const [editUser, setEditUser]     = useState<TenantUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantUser | null>(null)

  // Export
  const [exportOpen, setExportOpen]       = useState(false)
  const [exportOrgId, setExportOrgId]     = useState('all')
  const [exportStatus, setExportStatus]   = useState('all')
  const [exportFormat, setExportFormat]   = useState<'excel' | 'csv'>('excel')
  const [exportLoading, setExportLoading] = useState(false)

  // Import
  const [importOpen, setImportOpen]       = useState(false)
  const [importOrgId, setImportOrgId]     = useState('')
  const [importFile, setImportFile]       = useState<File | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importId, setImportId]           = useState<number | null>(null)

  const handleExport = async () => {
    setExportLoading(true)
    try {
      await exportUsers({
        organization_id: exportOrgId === 'all' ? undefined : exportOrgId,
        status: exportStatus === 'all' ? undefined : exportStatus,
        format: exportFormat,
      })
      setExportOpen(false)
    } catch {
      toast.error('Export failed. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }

  const handleImport = async () => {
    if (!importOrgId || !importFile) return
    setImportLoading(true)
    try {
      // Keep the dialog open on the progress view: the sheet is validated in full
      // before anything is written, so the outcome and any per-row reasons matter.
      const started = await importUsers(importOrgId, importFile)
      setImportId(started.data_import_id)
    } catch {
      toast.error('Import failed. Please check the file and try again.')
    } finally {
      setImportLoading(false)
    }
  }

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['users', { search: debouncedSearch, status, orgFilter, page }],
    queryFn: () => listUsers({
      q:               debouncedSearch || undefined,
      status:          status !== 'all' ? status : undefined,
      organization_id: orgFilter !== 'all' ? orgFilter : undefined,
      page,
      per_page:        PER_PAGE,
    }),
    staleTime: 30_000,
  })

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['user-metrics'],
    queryFn: getUserMetrics,
    staleTime: 60_000,
  })

  const { data: orgsData } = useQuery({
    queryKey: ['orgs-dropdown'],
    queryFn: () => listOrganizations({ per_page: 100 }),
    staleTime: 120_000,
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (user: TenantUser) =>
      user.status === 'active' ? deactivateUser(user.id) : activateUser(user.id),
    onSuccess: async (_, user) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['users'] }),
        qc.invalidateQueries({ queryKey: ['user-metrics'] }),
      ])
      toast.success(user.status === 'active' ? 'User deactivated' : 'User activated')
    },
    onError: () => toast.error('Action failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteUser(id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['users'] }),
        qc.invalidateQueries({ queryKey: ['user-metrics'] }),
      ])
      toast.success('User deleted')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Failed to delete user'),
  })

  const columns: ColumnDef<TenantUser, unknown>[] = [
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => {
        const u = row.original
        const initials = getInitials(u.name)
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              {u.avatar && <AvatarImage src={u.avatar} />}
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
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
      id: 'role',
      header: 'Role',
      cell: ({ row }) => (
        row.original.role
          ? <Badge variant="outline" className="text-xs capitalize">{row.original.role}</Badge>
          : <span className="text-muted-foreground text-sm">—</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'last_login',
      header: 'Last Login',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.last_login
            ? formatDistanceToNow(new Date(row.original.last_login), { addSuffix: true })
            : 'Never'}
        </span>
      ),
    },
    {
      id: 'joined',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.original.created_at), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const u = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setViewUser(u)}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditUser(u)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toggleStatusMutation.mutate(u)}>
                {u.status === 'active'
                  ? <><UserX className="mr-2 h-4 w-4" /> Deactivate</>
                  : <><UserCheck className="mr-2 h-4 w-4" /> Activate</>
                }
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(u)}
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
            placeholder="Search users…"
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
        <Select value={orgFilter} onValueChange={(v) => { setOrgFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All Organizations" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {orgsData?.data?.map((org) => (
              <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Users"     value={metrics?.total}          icon={Users}      isLoading={metricsLoading} />
        <KpiCard label="Active"          value={metrics?.active}         icon={UserCheck}  isLoading={metricsLoading} iconClassName="bg-emerald-500/10" />
        <KpiCard label="Inactive"        value={metrics?.inactive}       icon={UserX}      isLoading={metricsLoading} iconClassName="bg-red-500/10" />
        <KpiCard label="New This Month"  value={metrics?.new_this_month} icon={TrendingUp} isLoading={metricsLoading} iconClassName="bg-blue-500/10" />
      </div>

      <DataTable
        error={error}
        onRetry={() => void refetch()}
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        toolbar={toolbar}
        pagination={{ pageIndex: page - 1, pageSize: PER_PAGE }}
        pageCount={data?.meta?.last_page ?? 1}
        onPaginationChange={(s) => setPage(s.pageIndex + 1)}
      />

      {/* Create */}
      <SlideOver open={createOpen} onOpenChange={setCreateOpen} title="Add User" description="Create a new user account under an organization.">
        <UserCreateForm onSuccess={() => setCreateOpen(false)} onCancel={() => setCreateOpen(false)} />
      </SlideOver>

      {/* View */}
      <SlideOver open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)} title="User Details" description={viewUser?.email} width="lg">
        {viewUser && <UserDetail user={viewUser} />}
      </SlideOver>

      {/* Edit */}
      <SlideOver open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)} title="Edit User" description={editUser?.email}>
        {editUser && (
          <UserEditForm user={editUser} onSuccess={() => setEditUser(null)} onCancel={() => setEditUser(null)} />
        )}
      </SlideOver>

      {/* Delete */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="Delete User"
          description={`Permanently delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(deleteTarget.id)}
        />
      )}

      {/* Export */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Export Users</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Organization</Label>
              <SearchableSelect
                options={[
                  { value: 'all', label: 'All Organizations' },
                  ...(orgsData?.data ?? []).map((o) => ({ value: String(o.id), label: o.name })),
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
                  {USER_EXPORT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'excel' | 'csv')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={exportLoading}>
              <Download className="mr-2 h-4 w-4" />
              {exportLoading ? 'Exporting…' : 'Download'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import */}
      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) { setImportFile(null); setImportOrgId(''); setImportId(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Import Users</DialogTitle></DialogHeader>
          {importId !== null ? (
            <div className="py-2">
              <ImportProgress
                importId={importId}
                module="user"
                onDone={() => {
                  qc.invalidateQueries({ queryKey: ['users'] })
                  qc.invalidateQueries({ queryKey: ['user-metrics'] })
                  setImportOpen(false)
                  setImportFile(null)
                  setImportOrgId('')
                  setImportId(null)
                }}
                onReset={() => { setImportId(null); setImportFile(null) }}
              />
            </div>
          ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Organization <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={(orgsData?.data ?? []).map((o) => ({ value: String(o.identifier ?? o.id), label: o.name }))}
                value={importOrgId}
                onValueChange={setImportOrgId}
                placeholder="Select organization…"
                searchPlaceholder="Search organizations…"
              />
            </div>
            <ImportInstructions
              module="user"
              onDownloadTemplate={downloadUserTemplate}
              templateLabel="Download import template"
            />
            <div className="space-y-1.5">
              <Label>File <span className="text-destructive">*</span></Label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          )}
          {importId === null && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!importOrgId || !importFile || importLoading}>
              <Upload className="mr-2 h-4 w-4" />
              {importLoading ? 'Uploading…' : 'Import'}
            </Button>
          </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Admin Users Tab ──────────────────────────────────────────────────────────

export function AdminUsersTab() {
  const qc = useQueryClient()

  const { search, page, setSearch, setPage } = useUrlListState()
  const debouncedSearch = useDebounce(search, 300)

  const [formOpen, setFormOpen]             = useState(false)
  const [editUser, setEditUser]             = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget]     = useState<AdminUser | null>(null)

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin-users', { page, search: debouncedSearch }],
    queryFn: () => listAdminUsers({ page, per_page: PER_PAGE, q: debouncedSearch || undefined }),
    staleTime: 30_000,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles', 'admin'],
    queryFn: () => listRoles('admin'),
    staleTime: 120_000,
  })

  const saveMutation = useMutation({
    mutationFn: (v: AdminUserFormValues) =>
      editUser ? updateAdminUser(editUser.id, v) : createAdminUser(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(editUser ? 'Admin updated' : 'Invitation sent')
      setFormOpen(false)
      setEditUser(null)
    },
    onError: () => toast.error('Failed to save admin user'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteAdminUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Admin deleted')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Failed to delete admin'),
  })

  const openCreate = () => { setEditUser(null); setFormOpen(true) }
  const openEdit   = (u: AdminUser) => { setEditUser(u); setFormOpen(true) }

  const columns: ColumnDef<AdminUser, unknown>[] = [
    {
      id: 'name',
      header: 'Administrator',
      cell: ({ row }) => {
        const u = row.original
        const initials = getInitials(u.name)
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-bold text-violet-600 uppercase">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize text-xs gap-1">
          <KeyRound className="h-3 w-3" />
          {row.original.role ?? '—'}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status ?? 'active'} />,
    },
    {
      id: 'last_login',
      header: 'Last Login',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.last_login
            ? formatDistanceToNow(new Date(row.original.last_login), { addSuffix: true })
            : 'Never'}
        </span>
      ),
    },
    {
      id: 'joined',
      header: 'Joined',
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
        const u = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => openEdit(u)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(u)}
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
          placeholder="Search admins…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-8"
        />
      </div>
      <Button onClick={openCreate}>
        <Plus className="mr-2 h-4 w-4" /> Invite Admin
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
        isFetching={isFetching}
        toolbar={toolbar}
        pagination={{ pageIndex: page - 1, pageSize: PER_PAGE }}
        pageCount={data?.meta?.last_page ?? 1}
        onPaginationChange={(s) => setPage(s.pageIndex + 1)}
      />

      {/* Create / Edit */}
      <SlideOver
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditUser(null) }}
        title={editUser ? 'Edit Admin' : 'Invite Admin'}
        description={editUser ? 'Update admin details and role.' : 'Send an invitation to a new administrator.'}
      >
        <AdminUserForm
          user={editUser}
          roles={roles}
          onSubmit={(v) => saveMutation.mutate(v)}
          isPending={saveMutation.isPending}
          onCancel={() => setFormOpen(false)}
        />
      </SlideOver>

      {/* Delete */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="Delete Admin"
          description={`Permanently delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(deleteTarget.id)}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  return <div className="space-y-6"><PageHeader title="Customer users" description="Manage people and account access within customer organizations." icon={Users} /><TenantUsersTab /></div>
}
