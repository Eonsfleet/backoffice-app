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
import { updateUser } from '@/features/users/api'
import { listOrganizations } from '@/features/organizations/api'
import { listRoles } from '@/features/roles/api'
import type { TenantUser } from '@/types/api'

const editSchema = z.object({
  first_name:      z.string().min(1, 'Required'),
  last_name:       z.string().min(1, 'Required'),
  email:           z.string().email('Invalid email'),
  phone_number:    z.string().optional(),
  role:            z.string().optional(),
  organization_id: z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

export function UserEditForm({
  user,
  onSuccess,
  onCancel,
}: {
  user: TenantUser
  onSuccess: () => void
  onCancel: () => void
}) {
  const qc = useQueryClient()

  const [orgSearch, setOrgSearch] = useState('')
  const { data: orgsData, isFetching: orgsFetching } = useQuery({
    queryKey: ['orgs-search', orgSearch],
    queryFn: () => listOrganizations({ q: orgSearch || undefined, per_page: 20 }),
    staleTime: 30_000,
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles', 'client'],
    queryFn: () => listRoles('client'),
    staleTime: 300_000,
  })

  const orgOptions  = (orgsData?.data ?? []).map((o) => ({ value: String(o.id), label: o.name }))
  const roleOptions = (rolesData ?? []).map((r) => ({ value: r.name, label: r.name }))

  const [firstName, ...rest] = user.name.split(' ')
  const lastName = rest.join(' ')

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      first_name:      firstName ?? '',
      last_name:       lastName ?? '',
      email:           user.email,
      phone_number:    user.phone ?? '',
      role:            user.role ?? '',
      organization_id: user.organization ? String(user.organization.id) : '',
    },
  })
  const role = useWatch({ control, name: 'role' }) ?? ''
  const organizationId = useWatch({ control, name: 'organization_id' }) ?? ''

  const mutation = useMutation({
    mutationFn: (values: EditForm) => updateUser(user.id, {
      f_name:          values.first_name,
      l_name:          values.last_name,
      email:           values.email,
      phone_number:    values.phone_number || undefined,
      role:            values.role || undefined,
      organization_id: values.organization_id || undefined,
    }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['users'] }),
        qc.invalidateQueries({ queryKey: ['user-metrics'] }),
      ])
      toast.success('User updated')
      onSuccess()
    },
    onError: () => toast.error('Failed to update user'),
  })

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 px-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>First Name *</Label>
          <Input {...register('first_name')} placeholder="John" />
          {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Last Name *</Label>
          <Input {...register('last_name')} placeholder="Doe" />
          {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Email *</Label>
        <Input type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Phone</Label>
        <Input {...register('phone_number')} placeholder="+234…" />
      </div>
      <div className="space-y-1.5">
        <Label>Role</Label>
        <SearchableSelect
          options={roleOptions}
          value={role}
          onValueChange={(v) => setValue('role', v)}
          placeholder="Select role…"
          searchPlaceholder="Search roles…"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Organization</Label>
        <SearchableSelect
          options={orgOptions}
          value={organizationId}
          onValueChange={(v) => setValue('organization_id', v)}
          placeholder="Select organization…"
          searchPlaceholder="Search organizations…"
          onSearch={setOrgSearch}
          isLoading={orgsFetching}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending} className="flex-1">
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
