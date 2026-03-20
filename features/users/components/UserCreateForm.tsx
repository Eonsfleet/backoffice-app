'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { listUsers, createUser } from '@/features/users/api'
import { listOrganizations } from '@/features/organizations/api'
import { listRoles } from '@/features/roles/api'

const createSchema = z.object({
  f_name:      z.string().min(1, 'Required'),
  l_name:       z.string().min(1, 'Required'),
  email:           z.string().email('Invalid email'),
  password:        z.string().min(8, 'Min 8 characters'),
  phone_number:    z.string().optional(),
  role:            z.string().optional(),
  organization_id: z.string().min(1, 'Organization is required'),
})
type CreateForm = z.infer<typeof createSchema>

export function UserCreateForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
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

  const orgOptions = (orgsData?.data ?? []).map((o) => ({ value: String(o.id), label: o.name }))
  const roleOptions = (rolesData ?? []).map((r) => ({ value: r.name, label: r.name }))

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const mutation = useMutation({
    mutationFn: (values: CreateForm) => createUser({ ...values, organization_id: values.organization_id }),
    onSuccess: () => {
      toast.success('User created')
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user-metrics'] })
      onSuccess()
    },
    onError: () => toast.error('Failed to create user'),
  })

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-3">
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
        <Label>Password *</Label>
        <Input type="password" {...register('password')} placeholder="Min 8 characters" />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Phone</Label>
        <Input {...register('phone_number')} placeholder="+234…" />
      </div>
      <div className="space-y-1.5">
        <Label>Role</Label>
        <SearchableSelect
          options={roleOptions}
          value={watch('role') ?? ''}
          onValueChange={(v) => setValue('role', v)}
          placeholder="Select role…"
          searchPlaceholder="Search roles…"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Organization *</Label>
        <SearchableSelect
          options={orgOptions}
          value={watch('organization_id') ?? ''}
          onValueChange={(v) => setValue('organization_id', v)}
          placeholder="Select organization…"
          searchPlaceholder="Search organizations…"
          onSearch={setOrgSearch}
          isLoading={orgsFetching}
        />
        {errors.organization_id && <p className="text-xs text-destructive">{errors.organization_id.message}</p>}
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending} className="flex-1">
          {mutation.isPending ? 'Creating…' : 'Create User'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
