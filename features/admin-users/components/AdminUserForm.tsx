'use client'

import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import type { AdminUser } from '@/types/api'
import type { Role } from '@/features/roles/api'

const schema = z.object({
  name:         z.string().min(1, 'Name is required'),
  email:        z.string().email('Valid email required'),
  phone_number: z.string().optional(),
  role:         z.string().min(1, 'Role is required'),
})

export type AdminUserFormValues = z.infer<typeof schema>

interface AdminUserFormProps {
  user?:     AdminUser | null
  roles:     Role[]
  onSubmit:  (v: AdminUserFormValues) => void
  isPending: boolean
  onCancel:  () => void
}

export function AdminUserForm({ user, roles, onSubmit, isPending, onCancel }: AdminUserFormProps) {
  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<AdminUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:         user?.name  ?? '',
      email:        user?.email ?? '',
      phone_number: user?.phone_number ?? '',
      role:         user?.role  ?? '',
    },
  })

  const selectedRole = useWatch({ control, name: 'role' }) ?? ''
  const roleOptions = roles.map((r) => ({ value: r.name, label: r.name }))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Full Name *</Label>
          <Input {...register('name')} placeholder="John Doe" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Phone Number</Label>
          <Input {...register('phone_number')} placeholder="+2348120734527" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Email *</Label>
        <Input
          {...register('email')}
          type="email"
          placeholder="john@eonsfleet.com"
          disabled={!!user}
          className={user ? 'opacity-60' : ''}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Role *</Label>
        <SearchableSelect
          options={roleOptions}
          value={selectedRole}
          onValueChange={(v) => setValue('role', v, { shouldValidate: true })}
          placeholder="Select a role…"
          searchPlaceholder="Search roles…"
        />
        {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {user ? 'Save Changes' : 'Invite Admin'}
        </Button>
      </div>
    </form>
  )
}
