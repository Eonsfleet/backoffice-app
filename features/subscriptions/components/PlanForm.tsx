'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { SubscriptionPlan, Feature, Addon } from '@/types/api'

const schema = z.object({
  name:               z.string().min(1, 'Name is required'),
  description:        z.string().optional(),
  price_monthly:      z.number().min(0, 'Monthly price must be ≥ 0'),
  price_yearly:       z.number().min(0, 'Yearly price must be ≥ 0'),
  has_custom_pricing: z.boolean(),
  feature_ids:        z.array(z.string()),
  addon_ids:          z.array(z.string()),
})

type FormValues = z.infer<typeof schema>

interface PlanFormProps {
  plan?: SubscriptionPlan | null
  features?: Feature[]
  addons?: Addon[]
  loadingFeatures?: boolean
  loadingAddons?: boolean
  onSubmit: (values: FormValues) => void
  isPending: boolean
  onCancel: () => void
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

export function PlanForm({ plan, features, addons, loadingFeatures, loadingAddons, onSubmit, isPending, onCancel }: PlanFormProps) {
  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', description: '',
      price_monthly: 0, price_yearly: 0,
      has_custom_pricing: false,
      feature_ids: [], addon_ids: [],
    },
  })

  useEffect(() => {
    if (plan) {
      reset({
        name:               plan.name,
        description:        plan.description ?? '',
        price_monthly:      plan.price_monthly ?? 0,
        price_yearly:       plan.price_yearly ?? 0,
        has_custom_pricing: plan.has_custom_pricing ?? false,
        feature_ids:        plan.features?.map((f) => String(f.id)) ?? [],
        addon_ids:          plan.addons?.map((a) => String(a.id)) ?? [],
      })
    } else {
      reset({
        name: '', description: '',
        price_monthly: 0, price_yearly: 0,
        has_custom_pricing: false,
        feature_ids: [], addon_ids: [],
      })
    }
  }, [plan, reset])

  function toggleId(current: string[], id: string): string[] {
    return current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-5">
      <Field label="Plan Name *" error={errors.name?.message}>
        <Input {...register('name')} placeholder="e.g. Starter, Growth, Enterprise" />
      </Field>

      <Field label="Description" error={errors.description?.message}>
        <textarea
          {...register('description')}
          placeholder="Brief description of the plan"
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Monthly Price (₦) *" error={errors.price_monthly?.message}>
          <Input {...register('price_monthly', { valueAsNumber: true })} type="number" min={0} placeholder="20000" />
        </Field>
        <Field label="Yearly Price (₦) *" error={errors.price_yearly?.message}>
          <Input {...register('price_yearly', { valueAsNumber: true })} type="number" min={0} placeholder="200000" />
        </Field>
      </div>

      <Controller
        control={control}
        name="has_custom_pricing"
        render={({ field }) => (
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Custom Pricing</p>
              <p className="text-xs text-muted-foreground">Allow negotiated pricing for this plan</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            />
          </label>
        )}
      />

      {/* Features */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Features</Label>
        {loadingFeatures ? (
          <div className="space-y-1.5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
        ) : !features?.length ? (
          <p className="text-xs text-muted-foreground">No features available</p>
        ) : (
          <Controller
            control={control}
            name="feature_ids"
            render={({ field }) => (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {features.map((f) => {
                  const sid = String(f.id)
                  const checked = field.value.includes(sid)
                  return (
                    <label
                      key={f.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        checked ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-primary"
                        checked={checked}
                        onChange={() => field.onChange(toggleId(field.value, sid))}
                      />
                      <span>{f.name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          />
        )}
      </div>

      {/* Add-ons */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Add-ons</Label>
        {loadingAddons ? (
          <div className="space-y-1.5">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
        ) : !addons?.length ? (
          <p className="text-xs text-muted-foreground">No add-ons available</p>
        ) : (
          <Controller
            control={control}
            name="addon_ids"
            render={({ field }) => (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {addons.map((a) => {
                  const sid = String(a.id)
                  const checked = field.value.includes(sid)
                  return (
                    <label
                      key={a.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        checked ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-primary"
                        checked={checked}
                        onChange={() => field.onChange(toggleId(field.value, sid))}
                      />
                      <span>{a.name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          />
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {plan ? 'Save Changes' : 'Create Plan'}
        </Button>
      </div>
    </form>
  )
}
