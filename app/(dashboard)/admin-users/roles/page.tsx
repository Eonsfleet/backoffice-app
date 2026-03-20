'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KeyRound, Plus, MoreHorizontal, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SlideOver } from '@/components/shared/SlideOver'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { listAdminRoles as listRoles, createRole, updateRole, deleteRole } from '@/features/admin-users/api'
import type { AdminRole } from '@/features/admin-users/api'

// ─── Permission groups ────────────────────────────────────────────────────────

const PERMISSION_GROUPS: { label: string; permissions: { key: string; label: string }[] }[] = [
  {
    label: 'Organizations',
    permissions: [
      { key: 'organizations.view',    label: 'View' },
      { key: 'organizations.create',  label: 'Create' },
      { key: 'organizations.edit',    label: 'Edit' },
      { key: 'organizations.delete',  label: 'Delete' },
      { key: 'organizations.suspend', label: 'Suspend' },
    ],
  },
  {
    label: 'Subscriptions',
    permissions: [
      { key: 'subscriptions.view',   label: 'View' },
      { key: 'subscriptions.manage', label: 'Manage' },
    ],
  },
  {
    label: 'Devices',
    permissions: [
      { key: 'devices.view',       label: 'View' },
      { key: 'devices.manage',     label: 'Manage' },
      { key: 'devices.deactivate', label: 'Deactivate' },
    ],
  },
  {
    label: 'Billing',
    permissions: [
      { key: 'billing.view',   label: 'View' },
      { key: 'billing.export', label: 'Export' },
      { key: 'billing.retry',  label: 'Retry Payment' },
    ],
  },
  {
    label: 'Admin Users',
    permissions: [
      { key: 'admin_users.view',       label: 'View' },
      { key: 'admin_users.invite',     label: 'Invite' },
      { key: 'admin_users.edit',       label: 'Edit' },
      { key: 'admin_users.deactivate', label: 'Deactivate' },
      { key: 'admin_users.delete',     label: 'Delete' },
    ],
  },
  {
    label: 'Audit Logs',
    permissions: [
      { key: 'audit_logs.view',   label: 'View' },
      { key: 'audit_logs.export', label: 'Export' },
    ],
  },
  {
    label: 'Analytics',
    permissions: [
      { key: 'analytics.view', label: 'View' },
    ],
  },
  {
    label: 'Settings',
    permissions: [
      { key: 'settings.view',   label: 'View' },
      { key: 'settings.manage', label: 'Manage' },
    ],
  },
]

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key))

// ─── Form ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  name:        z.string().min(1, 'Name is required'),
  permissions: z.array(z.string()),
})
type FormValues = z.infer<typeof schema>

function RoleForm({ role, onSubmit, isPending, onCancel }: {
  role?: AdminRole | null
  onSubmit: (v: FormValues) => void
  isPending: boolean
  onCancel: () => void
}) {
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        role?.name ?? '',
      permissions: role?.permissions ?? [],
    },
  })

  const selected = watch('permissions')

  function toggle(current: string[], key: string): string[] {
    return current.includes(key) ? current.filter((x) => x !== key) : [...current, key]
  }

  function toggleGroup(current: string[], keys: string[]): string[] {
    const allOn = keys.every((k) => current.includes(k))
    return allOn
      ? current.filter((x) => !keys.includes(x))
      : [...new Set([...current, ...keys])]
  }

  const allSelected = ALL_PERMISSIONS.every((k) => selected.includes(k))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Role Name *</Label>
        <Input {...register('name')} placeholder="e.g. Support Agent, Installer" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <Controller
        control={control}
        name="permissions"
        render={({ field }) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Permissions</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => field.onChange(allSelected ? [] : [...ALL_PERMISSIONS])}
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="space-y-3">
              {PERMISSION_GROUPS.map((group) => {
                const groupKeys   = group.permissions.map((p) => p.key)
                const allGroupOn  = groupKeys.every((k) => field.value.includes(k))
                const someGroupOn = groupKeys.some((k) => field.value.includes(k))

                return (
                  <div key={group.label} className="rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between px-3 py-2 text-sm font-medium transition-colors ${
                        allGroupOn ? 'bg-primary/5 text-primary' : 'bg-muted/40 text-foreground'
                      }`}
                      onClick={() => field.onChange(toggleGroup(field.value, groupKeys))}
                    >
                      <span>{group.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {groupKeys.filter((k) => field.value.includes(k)).length}/{groupKeys.length}
                      </span>
                    </button>
                    <div className="flex flex-wrap gap-2 px-3 py-2">
                      {group.permissions.map((perm) => {
                        const checked = field.value.includes(perm.key)
                        return (
                          <label
                            key={perm.key}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
                              checked ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="h-3 w-3 accent-primary"
                              checked={checked}
                              onChange={() => field.onChange(toggle(field.value, perm.key))}
                            />
                            {perm.label}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {role ? 'Save Changes' : 'Create Role'}
        </Button>
      </div>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]       = useState(false)
  const [editRole, setEditRole]       = useState<AdminRole | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminRole | null>(null)

  const { data: roles, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: listRoles,
    staleTime: 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: (v: FormValues) =>
      editRole ? updateRole(editRole.id, v) : createRole(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      toast.success(editRole ? 'Role updated' : 'Role created')
      setFormOpen(false)
      setEditRole(null)
    },
    onError: () => toast.error('Failed to save role'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteRole(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      toast.success('Role deleted')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Failed to delete role'),
  })

  const openCreate = () => { setEditRole(null); setFormOpen(true) }
  const openEdit   = (r: AdminRole) => { setEditRole(r); setFormOpen(true) }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description={roles ? `${roles.length} roles` : 'Define admin roles and permissions'}
        icon={KeyRound}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Role
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !roles?.length ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
          <KeyRound className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No roles yet.</p>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Role</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <p className="font-semibold text-foreground">{role.name}</p>
                  </div>
                  {role.is_custom ? (
                    <Badge variant="secondary" className="text-[10px]">Custom</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">System</Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(role)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    {role.is_custom && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(role)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">
                  {role.permissions?.length ?? 0} permission{role.permissions?.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1">
                  {(role.permissions ?? []).slice(0, 6).map((p) => (
                    <Badge key={p} variant="outline" className="text-[10px] font-normal">
                      {p.replace(/_/g, ' ').replace('.', ' · ')}
                    </Badge>
                  ))}
                  {(role.permissions?.length ?? 0) > 6 && (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      +{role.permissions.length - 6} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SlideOver
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditRole(null) }}
        title={editRole ? 'Edit Role' : 'New Role'}
        description={editRole ? 'Update role name and permissions.' : 'Create a new admin role with specific permissions.'}
        width="lg"
      >
        <RoleForm
          role={editRole}
          onSubmit={(v) => saveMutation.mutate(v)}
          isPending={saveMutation.isPending}
          onCancel={() => setFormOpen(false)}
        />
      </SlideOver>

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="Delete Role"
          description={`Permanently delete "${deleteTarget.name}"? Admins with this role will lose their permissions.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(deleteTarget.id)}
        />
      )}
    </div>
  )
}
