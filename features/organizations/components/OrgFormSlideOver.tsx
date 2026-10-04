'use client'

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { organizationCreateSchema, organizationDetailsSchema, organizationCreatePayload, type OrganizationFormValues } from '@/features/organizations/form-schema'
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

type FormValues = OrganizationFormValues

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
    resolver: zodResolver(isEdit ? organizationDetailsSchema : organizationCreateSchema) as any,
    defaultValues: { billing_type: 'poc', evaluation_days: 30, billing_cycle: 'monthly' },
  })
  const billingType = useWatch({ control, name: 'billing_type' }) ?? 'poc'
  const planId = useWatch({ control, name: 'plan_id' }) ?? ''
  const billingCycle = useWatch({ control, name: 'billing_cycle' }) ?? 'monthly'

  // Only the create form needs the catalogue — an edit never touches the plan.
  const { data: plans = [], isFetching: plansFetching } = useQuery({
    queryKey: ['plans', 'organization-form'],
    queryFn: listPlans,
    enabled: open && !isEdit,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (org) {
      // Prefill each address part from the flattened resource. Blanking these
      // out (as this form used to) submitted empty strings that overwrote the
      // organization's stored street/city/state/country on every save.
      reset({
        name:         org.name ?? '',
        email:        org.email ?? '',
        phone_number: org.phone ?? '',
        fleet_size:   org.fleet_size ?? undefined,
        industry:     org.industry ?? '',
        street:       org.street ?? '',
        city:         org.city ?? '',
        state:        org.state ?? '',
        country:      org.country ?? '',
        plan_id:      String(org.current_plan?.plan?.id ?? ''),
        billing_cycle: (org.current_plan?.billing_cycle as 'monthly' | 'yearly') ?? 'monthly',
        billing_type: 'poc', evaluation_days: 30,
      })
    } else {
      reset({
        name: '', email: '', phone_number: '', industry: '',
        street: '', city: '', state: '', country: '',
        plan_id: '', billing_type: 'poc', billing_cycle: 'monthly', evaluation_days: 30,
      })
    }
  }, [org, reset, open])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (isEdit) return updateOrganization(org!.id, organizationDetailsSchema.parse(values))
      return createOrganization(organizationCreatePayload(values))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      if (isEdit) qc.invalidateQueries({ queryKey: ['organization', String(org!.id)] })
      toast.success(isEdit ? 'Organization updated' : 'Organization created')
      onOpenChange(false)
    },
    onError: (err) => {
      // Surface the API's own validation message (e.g. "The email has already
      // been taken.") instead of a generic failure the admin can't act on.
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? (isEdit ? 'Failed to update organization' : 'Failed to create organization'))
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
        {!isEdit && <p className="text-sm text-muted-foreground">New organizations are created with an active account status.</p>}
        <Field label="Organization Name *" error={errors.name?.message}>
          <Input {...register('name')} placeholder="Sahara Transport" />
        </Field>

        {/* Email + Phone */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business Email" error={errors.email?.message}>
            <Input {...register('email')} placeholder="admin@sahara.com" type="email" />
          </Field>
          <Field label="Phone Number" error={errors.phone_number?.message}>
            <Input {...register('phone_number')} placeholder="+2348120734527" />
          </Field>
        </div>

        {/* Fleet size + Industry */}
        <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="grid gap-4 sm:grid-cols-2">
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
            <p className="text-xs text-muted-foreground">
              Choose a POC evaluation or a production subscription for the selected plan.
            </p>
            {billingType === 'production' && <p className="text-xs text-muted-foreground">
              The production plan is assigned now. Purchase asset capacity from the subscriber account before onboarding vehicles.
            </p>}

            <Field label="Plan Type *" error={errors.billing_type?.message}>
              <Select value={billingType} onValueChange={(value) => setValue('billing_type', value as FormValues['billing_type'], { shouldValidate: true })}>
                <SelectTrigger aria-label="Plan type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="poc">POC (proof of concept)</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Plan *" error={errors.plan_id?.message}>
              <Select
                value={planId}
                onValueChange={(value) => setValue('plan_id', value, { shouldValidate: true })}
                disabled={plansFetching}
              >
                <SelectTrigger aria-label="Plan">
                  <SelectValue placeholder={plansFetching ? 'Loading plans…' : 'Select plan'} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              {billingType === 'production' && <Field label="Billing Cycle *" error={errors.billing_cycle?.message}>
                <Select
                  value={billingCycle}
                  onValueChange={(value) => setValue('billing_cycle', value as FormValues['billing_cycle'], { shouldValidate: true })}
                >
                  <SelectTrigger aria-label="Billing cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </Field>}

              {billingType === 'poc' && <Field label="POC Period (days) *" error={errors.evaluation_days?.message}>
                <Input {...register('evaluation_days')} aria-label="POC period in days" type="number" min={15} max={30} step={1} placeholder="30" />
                <p className="text-xs text-muted-foreground">15–30 days. POC evaluations are measured in days.</p>
              </Field>}
            </div>
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
