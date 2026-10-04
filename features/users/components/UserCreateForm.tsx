'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { createUser } from '@/features/users/api'
import { listOrganizations } from '@/features/organizations/api'
import { listRoles } from '@/features/roles/api'

const createSchema = z.object({
  f_name:      z.string().min(1, 'Required'),
  l_name:       z.string().min(1, 'Required'),
  email:           z.string().email('Invalid email'),
  phone_number:    z.string().optional(),
  role:            z.string().optional(),
  organization_id: z.string().min(1, 'Organization is required'),
})
type CreateForm = z.infer<typeof createSchema>

interface UserCreateFormProps {
  onSuccess: () => void
  onCancel: () => void
  /** Fixes the user to this organization and hides the organization picker. */
  organization?: { id: string | number; name: string }
  /** Fixes the user's role and hides the role picker. */
  role?: { name: string; label: string }
  cancelLabel?: string
}

export function UserCreateForm({ onSuccess, onCancel, organization, role: fixedRole, cancelLabel = 'Cancel' }: UserCreateFormProps) {
  const qc = useQueryClient()

  const [orgSearch, setOrgSearch] = useState('')
  const { data: orgsData, isFetching: orgsFetching } = useQuery({
    queryKey: ['orgs-search', orgSearch],
    queryFn: () => listOrganizations({ q: orgSearch || undefined, per_page: 20 }),
    staleTime: 30_000,
    enabled: !organization,
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles', 'client'],
    queryFn: () => listRoles('client'),
    staleTime: 300_000,
    enabled: !fixedRole,
  })

  const orgOptions = (orgsData?.data ?? []).map((o) => ({ value: String(o.id), label: o.name }))
  const roleOptions = (rolesData ?? []).map((r) => ({ value: r.name, label: r.name }))

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { organization_id: organization ? String(organization.id) : '', role: fixedRole?.name },
  })
  const role = useWatch({ control, name: 'role' }) ?? ''
  const organizationId = useWatch({ control, name: 'organization_id' }) ?? ''

  const mutation = useMutation({
    mutationFn: (values: CreateForm) => createUser({ ...values, organization_id: values.organization_id }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['users'] }),
        qc.invalidateQueries({ queryKey: ['user-metrics'] }),
      ])
      toast.success('User created')
      onSuccess()
    },
    onError: (err) => {
      // Show the API's reason (e.g. "The email has already been taken.").
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to create user')
    },
  })

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>First Name *</Label>
          <Input {...register('f_name')} placeholder="John" />
          {errors.f_name && <p className="text-xs text-destructive">{errors.f_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Last Name *</Label>
          <Input {...register('l_name')} placeholder="Doe" />
          {errors.l_name && <p className="text-xs text-destructive">{errors.l_name.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Email *</Label>
        <Input type="email" {...register('email')} placeholder="john@example.com" />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Phone</Label>
        <Input {...register('phone_number')} placeholder="+234…" />
      </div>
      <div className="space-y-1.5">
        <Label>Role</Label>
        {fixedRole ? <Input value={fixedRole.label} disabled readOnly /> : (
          <SearchableSelect
            options={roleOptions}
            value={role}
            onValueChange={(v) => setValue('role', v)}
            placeholder="Select role…"
            searchPlaceholder="Search roles…"
          />
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Organization{organization ? '' : ' *'}</Label>
        {organization ? <Input value={organization.name} disabled readOnly /> : (
          <SearchableSelect
            options={orgOptions}
            value={organizationId}
            onValueChange={(v) => setValue('organization_id', v)}
            placeholder="Select organization…"
            searchPlaceholder="Search organizations…"
            onSearch={setOrgSearch}
            isLoading={orgsFetching}
          />
        )}
        {errors.organization_id && <p className="text-xs text-destructive">{errors.organization_id.message}</p>}
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending} className="flex-1">
          {mutation.isPending ? 'Creating…' : 'Create User'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>{cancelLabel}</Button>
      </div>
    </form>
  )
}
