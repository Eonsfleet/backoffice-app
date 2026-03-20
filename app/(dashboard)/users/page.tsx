'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type ColumnDef } from '@tanstack/react-table'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Users, Search, MoreHorizontal, Eye, Pencil, Trash2,
  UserCheck, UserX, TrendingUp, Plus, ShieldCheck,
  KeyRound, UserCog,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import {
  listUsers, getUserMetrics, deactivateUser, activateUser, deleteUser,
} from '@/features/users/api'
import { listOrganizations } from '@/features/organizations/api'
import { UserCreateForm } from '@/features/users/components/UserCreateForm'
import { UserEditForm }   from '@/features/users/components/UserEditForm'
import { UserDetail }     from '@/features/users/components/UserDetail'

import {
  listAdminUsers, createAdminUser, updateAdminUser,
  deactivateAdminUser, deleteAdminUser,
} from '@/features/admin-users/api'
import { listRoles } from '@/features/roles/api'
import { AdminUserForm, type AdminUserFormValues } from '@/features/admin-users/components/AdminUserForm'
import type { Role } from '@/features/roles/api'

import type { TenantUser, AdminUser } from '@/types/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'all',      label: 'All Statuses' },
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const PER_PAGE = 15

// ─── Tenant Users Tab ─────────────────────────────────────────────────────────

function TenantUsersTab() {
  const qc = useQueryClient()

  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [page, setPage]       = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [viewUser, setViewUser]     = useState<TenantUser | null>(null)
  const [editUser, setEditUser]     = useState<TenantUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantUser | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search, status, orgFilter, page }],
    queryFn: () => listUsers({
      q:               search || undefined,
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
    onSuccess: (_, user) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user-metrics'] })
      toast.success(user.status === 'active' ? 'User deactivated' : 'User activated')
    },
    onError: () => toast.error('Action failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user-metrics'] })
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
        const initials = u.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users…"
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
      <Button onClick={() => setCreateOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Add User
      </Button>
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
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
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
      <SlideOver open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)} title="User Details" description={viewUser?.email}>
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
    </div>
  )
}

// ─── Admin Users Tab ──────────────────────────────────────────────────────────

function AdminUsersTab() {
  const qc = useQueryClient()

  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)

  const [formOpen, setFormOpen]             = useState(false)
  const [editUser, setEditUser]             = useState<AdminUser | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget]     = useState<AdminUser | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', { page, search }],
    queryFn: () => listAdminUsers({ page, per_page: PER_PAGE, q: search || undefined }),
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

  const deactivateMutation = useMutation({
    mutationFn: (id: string | number) => deactivateAdminUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Admin deactivated')
      setDeactivateTarget(null)
    },
    onError: () => toast.error('Failed to deactivate admin'),
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
        const initials = u.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'
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
              <DropdownMenuItem onClick={() => setDeactivateTarget(u)}>
                <UserX className="mr-2 h-4 w-4" /> Deactivate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
      <div className="relative min-w-[200px] max-w-sm flex-1">
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
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
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

      {/* Deactivate */}
      {deactivateTarget && (
        <ConfirmDialog
          open={!!deactivateTarget}
          onOpenChange={(o) => !o && setDeactivateTarget(null)}
          title="Deactivate Admin"
          description={`Deactivate "${deactivateTarget.name}"? They will lose access immediately.`}
          confirmLabel="Deactivate"
          variant="destructive"
          onConfirm={() => deactivateMutation.mutateAsync(deactivateTarget.id)}
        />
      )}

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
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage tenant users and platform administrators"
        icon={UserCog}
      />

      <Tabs defaultValue="tenant">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
          <TabsTrigger
            value="tenant"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-1 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent"
          >
            <Users className="mr-2 h-4 w-4" />
            Tenant Users
          </TabsTrigger>
          <TabsTrigger
            value="admins"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-1 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Administrators
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenant" className="mt-6">
          <TenantUsersTab />
        </TabsContent>

        <TabsContent value="admins" className="mt-6">
          <AdminUsersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
