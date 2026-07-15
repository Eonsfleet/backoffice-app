'use client'

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { SlideOver } from '@/components/shared/SlideOver'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createOrganization, updateOrganization } from '@/features/organizations/api'
import { listPlans } from '@/features/subscriptions/api'
import type { Organization } from '@/types/api'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const schema = z.object({
  name:         z.string().min(2, 'Name is required'),
  email:        z.string().email('Invalid email'),
  phone_number: z.string().optional(),
  fleet_size:   z.coerce.number().int().min(1, 'Fleet size is required'),
  industry:     z.string().min(1, 'Industry is required'),
  street:       z.string().optional(),
  city:         z.string().optional(),
  state:        z.string().optional(),
  country:      z.string().optional(),
  billing_type: z.enum(['poc', 'trial', 'direct_subscription']).default('poc'),
  plan_id:      z.string().optional(),
  billing_cycle: z.enum(['monthly', 'yearly']).optional(),
  evaluation_days: z.coerce.number().int().min(1).optional(),
}).superRefine((values, ctx) => {
  if ((values.billing_type === 'trial' || values.billing_type === 'direct_subscription') && !values.plan_id) {
    ctx.addIssue({ code: 'custom', path: ['plan_id'], message: 'Plan is required' })
  }
  if (values.billing_type === 'direct_subscription' && !values.billing_cycle) {
    ctx.addIssue({ code: 'custom', path: ['billing_cycle'], message: 'Billing cycle is required' })
  }
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

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      billing_type: 'poc',
      billing_cycle: 'monthly',
      evaluation_days: 30,
    },
  })
  const billingType = useWatch({ control, name: 'billing_type' }) ?? 'poc'
  const planId = useWatch({ control, name: 'plan_id' }) ?? ''
  const billingCycle = useWatch({ control, name: 'billing_cycle' }) ?? 'monthly'

  const { data: plans = [], isFetching: plansFetching } = useQuery({
    queryKey: ['plans', 'organization-form'],
    queryFn: listPlans,
    enabled: open && !isEdit,
    staleTime: 60_000,
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
        billing_type: 'poc',
        billing_cycle: 'monthly',
        evaluation_days: 30,
      })
    } else {
      reset({
        name: '', email: '', phone_number: '', industry: '',
        street: '', city: '', state: '', country: '',
        billing_type: 'poc', plan_id: undefined, billing_cycle: 'monthly', evaluation_days: 30,
      })
    }
  }, [org, reset, open])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        plan_id: values.plan_id ? Number(values.plan_id) : undefined,
        billing_cycle: values.billing_type === 'direct_subscription' ? values.billing_cycle : undefined,
        evaluation_days: values.billing_type === 'poc' ? values.evaluation_days : undefined,
      }

      if (isEdit) {
        const {
          billing_type: _billingType,
          plan_id: _planId,
          billing_cycle: _billingCycle,
          evaluation_days: _evaluationDays,
          ...details
        } = payload
        return updateOrganization(org!.id, details)
      }

      return createOrganization(payload)
    },
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

        {!isEdit && (
          <div className="space-y-4 rounded-md border border-border p-4">
            <Field label="Billing Type *" error={errors.billing_type?.message}>
              <Select
                value={billingType}
                onValueChange={(value) => setValue('billing_type', value as FormValues['billing_type'], { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poc">POC</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="direct_subscription">Direct Subscription</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {billingType === 'poc' && (
              <Field label="Evaluation Days" error={errors.evaluation_days?.message}>
                <Input {...register('evaluation_days')} type="number" min={1} placeholder="30" />
              </Field>
            )}

            {(billingType === 'trial' || billingType === 'direct_subscription') && (
              <Field label="Plan *" error={errors.plan_id?.message}>
                <Select
                  value={planId}
                  onValueChange={(value) => setValue('plan_id', value, { shouldValidate: true })}
                  disabled={plansFetching}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={plansFetching ? 'Loading plans...' : 'Select plan'} />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {billingType === 'direct_subscription' && (
              <Field label="Billing Cycle *" error={errors.billing_cycle?.message}>
                <Select
                  value={billingCycle}
                  onValueChange={(value) => setValue('billing_cycle', value as FormValues['billing_cycle'], { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
        )}

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
