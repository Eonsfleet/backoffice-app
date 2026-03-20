'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Layers, Plus, MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Check } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { listPlans, createPlan, updatePlan, togglePlanStatus, listFeatures, listAddons } from '@/features/subscriptions/api'
import type { SubscriptionPlan } from '@/types/api'
import { PlanForm } from '@/features/subscriptions/components/PlanForm'

function fmt(value: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)
}

export default function PlansPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]       = useState(false)
  const [editPlan, setEditPlan]       = useState<SubscriptionPlan | null>(null)
  const [toggleTarget, setToggleTarget] = useState<SubscriptionPlan | null>(null)

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: listPlans,
    staleTime: 60_000,
  })

  const { data: features, isLoading: loadingFeatures } = useQuery({
    queryKey: ['features'],
    queryFn: listFeatures,
    staleTime: 120_000,
  })

  const { data: addons, isLoading: loadingAddons } = useQuery({
    queryKey: ['addons'],
    queryFn: listAddons,
    staleTime: 120_000,
  })

  const saveMutation = useMutation({
    mutationFn: (values: {
      name: string; description?: string
      price_monthly: number; price_yearly: number; has_custom_pricing: boolean
      feature_ids: string[]; addon_ids: string[]
    }) => {
      const payload = {
        name:               values.name,
        description:        values.description ?? '',
        price_monthly:      values.price_monthly,
        price_yearly:       values.price_yearly,
        has_custom_pricing: values.has_custom_pricing,
        features:           values.feature_ids.map((id) => ({ id })),
        addons:             values.addon_ids,
      }
      return editPlan ? updatePlan(editPlan.id, payload) : createPlan(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] })
      toast.success(editPlan ? 'Plan updated' : 'Plan created')
      setFormOpen(false)
      setEditPlan(null)
    },
    onError: () => toast.error('Failed to save plan'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string | number) => togglePlanStatus(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan status updated')
      setToggleTarget(null)
    },
    onError: () => toast.error('Failed to toggle plan status'),
  })

  const openCreate = () => { setEditPlan(null); setFormOpen(true) }
  const openEdit   = (plan: SubscriptionPlan) => { setEditPlan(plan); setFormOpen(true) }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Plans"
        description={plans ? `${plans.length} plans` : 'Manage pricing plans'}
        icon={Layers}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Plan
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : !plans?.length ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
          <Layers className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No plans yet. Create your first plan.</p>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Plan</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative flex flex-col ${!plan.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    <Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => openEdit(plan)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setToggleTarget(plan)}>
                      {plan.is_active
                        ? <><ToggleLeft className="mr-2 h-4 w-4" /> Deactivate</>
                        : <><ToggleRight className="mr-2 h-4 w-4" /> Activate</>
                      }
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-3">
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {fmt(plan.price_monthly)}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmt(plan.price_yearly)}/yr
                    {plan.has_custom_pricing && ' · Custom pricing'}
                  </p>
                </div>

                {plan.features?.length > 0 && (
                  <ul className="space-y-1.5">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-primary shrink-0" />
                        {f.name}
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-xs text-muted-foreground pl-5">+{plan.features.length - 4} more</li>
                    )}
                  </ul>
                )}

                {plan.subscriber_count != null && (
                  <p className="mt-auto pt-2 text-xs font-medium text-muted-foreground border-t border-border">
                    {plan.subscriber_count} subscriber{plan.subscriber_count !== 1 ? 's' : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SlideOver
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditPlan(null) }}
        title={editPlan ? 'Edit Plan' : 'New Plan'}
        description={editPlan ? 'Update plan details and pricing.' : 'Create a new subscription plan.'}
      >
        <PlanForm
          plan={editPlan}
          features={features}
          addons={addons}
          loadingFeatures={loadingFeatures}
          loadingAddons={loadingAddons}
          onSubmit={(v) => saveMutation.mutate(v)}
          isPending={saveMutation.isPending}
          onCancel={() => setFormOpen(false)}
        />
      </SlideOver>

      {toggleTarget && (
        <ConfirmDialog
          open={!!toggleTarget}
          onOpenChange={(o) => !o && setToggleTarget(null)}
          title={toggleTarget.is_active ? 'Deactivate Plan' : 'Activate Plan'}
          description={`${toggleTarget.is_active ? 'Deactivate' : 'Activate'} the "${toggleTarget.name}" plan?`}
          confirmLabel={toggleTarget.is_active ? 'Deactivate' : 'Activate'}
          variant={toggleTarget.is_active ? 'destructive' : 'default'}
          onConfirm={() => toggleMutation.mutateAsync(toggleTarget.id)}
        />
      )}
    </div>
  )
}
