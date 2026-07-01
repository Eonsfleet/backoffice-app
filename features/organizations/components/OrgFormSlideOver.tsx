'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { SlideOver } from '@/components/shared/SlideOver'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createOrganization, updateOrganization } from '@/features/organizations/api'
import type { Organization } from '@/types/api'

const schema = z.object({
  name:         z.string().min(2, 'Name is required'),
  email:        z.string().email('Invalid email').or(z.literal('')).optional(),
  phone_number: z.string().optional(),
  fleet_size:   z.coerce.number().int().min(1).optional(),
  industry:     z.string().optional(),
  street:       z.string().optional(),
  city:         z.string().optional(),
  state:        z.string().optional(),
  country:      z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface OrgFormSlideOverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  org?: Organization | null
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function OrgFormSlideOver({ open, onOpenChange, org }: OrgFormSlideOverProps) {
  const qc = useQueryClient()
  const isEdit = !!org

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  useEffect(() => {
    if (org) {
      reset({
        name:         org.name ?? '',
        email:        org.email ?? '',
        phone_number: org.phone ?? '',
        fleet_size:   org.fleet_size ?? undefined,
        industry:     org.industry ?? '',
        street:       org.address ?? '',
        city:         '',
        state:        '',
        country:      '',
      })
    } else {
      reset({
        name: '', email: '', phone_number: '', industry: '',
        street: '', city: '', state: '', country: '',
      })
    }
  }, [org, reset, open])

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit
        ? updateOrganization(org!.id, values)
        : createOrganization(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      if (isEdit) qc.invalidateQueries({ queryKey: ['organization', String(org!.id)] })
      toast.success(isEdit ? 'Organization updated' : 'Organization created')
      onOpenChange(false)
    },
    onError: () => {
      toast.error(isEdit ? 'Failed to update organization' : 'Failed to create organization')
    },
  })

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Organization' : 'New Organization'}
      description={isEdit ? 'Update organization details.' : 'Add a new organization to the platform.'}
      width="md"
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5 px-5">

        {/* Name */}
        <Field label="Organization Name *" error={errors.name?.message}>
          <Input {...register('name')} placeholder="Sahara Transport" />
        </Field>

        {/* Email + Phone */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Business Email" error={errors.email?.message}>
            <Input {...register('email')} placeholder="admin@sahara.com" type="email" />
          </Field>
          <Field label="Phone Number" error={errors.phone_number?.message}>
            <Input {...register('phone_number')} placeholder="+2348120734527" />
          </Field>
        </div>

        {/* Fleet size + Industry */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fleet Size" error={errors.fleet_size?.message}>
            <Input {...register('fleet_size')} placeholder="50" type="number" min={1} />
          </Field>
          <Field label="Industry" error={errors.industry?.message}>
            <Input {...register('industry')} placeholder="Logistics" />
          </Field>
        </div>

        {/* Address */}
        <Field label="Street Address" error={errors.street?.message}>
          <Input {...register('street')} placeholder="14 Alimosho Street" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="City" error={errors.city?.message}>
            <Input {...register('city')} placeholder="Lagos" />
          </Field>
          <Field label="State" error={errors.state?.message}>
            <Input {...register('state')} placeholder="Lagos" />
          </Field>
        </div>

        <Field label="Country" error={errors.country?.message}>
          <Input {...register('country')} placeholder="Nigeria" />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Organization'}
          </Button>
        </div>
      </form>
    </SlideOver>
  )
}
