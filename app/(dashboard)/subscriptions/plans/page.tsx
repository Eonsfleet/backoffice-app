'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BadgeCheck, Check, Layers, MoreHorizontal, Pencil, Plus, ToggleLeft, ToggleRight, Users } from 'lucide-react'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SlideOver } from '@/components/shared/SlideOver'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PlanForm } from '@/features/subscriptions/components/PlanForm'
import { SubscriptionWorkspace } from '@/features/subscriptions/components/SubscriptionWorkspace'
import { createPlan, listAddons, listFeatures, listPlans, togglePlanStatus, updatePlan } from '@/features/subscriptions/api'
import type { SubscriptionPlan } from '@/types/api'

function fmt(value: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)
}

export default function PlansPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null)
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
      name: string
      description?: string
      price_monthly: number
      price_yearly: number
      has_custom_pricing: boolean
      feature_ids: string[]
      addon_ids: string[]
    }) => {
      const payload = {
        name: values.name,
        description: values.description ?? '',
        price_monthly: values.price_monthly,
        price_yearly: values.price_yearly,
        has_custom_pricing: values.has_custom_pricing,
        features: values.feature_ids.map((id) => ({ id })),
        addons: values.addon_ids,
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

  const openCreate = () => {
    setEditPlan(null)
    setFormOpen(true)
  }

  const openEdit = (plan: SubscriptionPlan) => {
    setEditPlan(plan)
    setFormOpen(true)
  }

  const activePlans = plans?.filter((plan) => plan.is_active).length ?? 0
  const subscribers = plans?.reduce((sum, plan) => sum + (plan.subscriber_count ?? 0), 0) ?? 0
  const customPlans = plans?.filter((plan) => plan.has_custom_pricing).length ?? 0

  return (
    <SubscriptionWorkspace
      title="Plans"
      description="Design, compare, and maintain the pricing tiers available to organizations."
      actions={
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Plan
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Active Plans</p>
              <p className="text-2xl font-bold">{activePlans}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Subscribers</p>
              <p className="text-2xl font-bold">{subscribers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <BadgeCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Custom Pricing</p>
              <p className="text-2xl font-bold">{customPlans}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : !plans?.length ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-20 text-center">
          <Layers className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No plans yet. Create your first plan.</p>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Plan</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative flex flex-col overflow-hidden ${!plan.is_active ? 'opacity-70' : ''}`}>
              <div className={`h-1 ${plan.is_active ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-foreground">{plan.name}</h3>
                    <Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {plan.has_custom_pricing && (
                      <Badge variant="outline" className="text-[10px]">Custom</Badge>
                    )}
                  </div>
                  {plan.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{plan.description}</p>
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

              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3">
                  <div>
                    <p className="text-[11px] uppercase text-muted-foreground">Monthly</p>
                    <p className="text-lg font-bold tabular-nums">{fmt(plan.price_monthly)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-muted-foreground">Yearly</p>
                    <p className="text-lg font-bold tabular-nums">{fmt(plan.price_yearly)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-muted-foreground">Features</p>
                    <p className="font-semibold">{plan.features?.length ?? 0}</p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-muted-foreground">Add-ons</p>
                    <p className="font-semibold">{plan.addons?.length ?? 0}</p>
                  </div>
                </div>

                {plan.features?.length > 0 && (
                  <ul className="space-y-1.5">
                    {plan.features.slice(0, 5).map((feature) => (
                      <li key={feature.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{feature.name}</span>
                      </li>
                    ))}
                    {plan.features.length > 5 && (
                      <li className="pl-5 text-xs text-muted-foreground">+{plan.features.length - 5} more</li>
                    )}
                  </ul>
                )}

                <div className="mt-auto flex items-center justify-between border-t pt-3 text-xs">
                  <span className="text-muted-foreground">Subscribers</span>
                  <span className="font-semibold tabular-nums">{plan.subscriber_count ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SlideOver
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditPlan(null) }}
        title={editPlan ? 'Edit Plan' : 'New Plan'}
        description={editPlan ? 'Update plan details and pricing.' : 'Create a new subscription plan.'}
      >
        <PlanForm
          plan={editPlan}
          features={features}
          addons={addons}
          loadingFeatures={loadingFeatures}
          loadingAddons={loadingAddons}
          onSubmit={(values) => saveMutation.mutate(values)}
          isPending={saveMutation.isPending}
          onCancel={() => setFormOpen(false)}
        />
      </SlideOver>

      {toggleTarget && (
        <ConfirmDialog
          open={!!toggleTarget}
          onOpenChange={(open) => !open && setToggleTarget(null)}
          title={toggleTarget.is_active ? 'Deactivate Plan' : 'Activate Plan'}
          description={`${toggleTarget.is_active ? 'Deactivate' : 'Activate'} the "${toggleTarget.name}" plan?`}
          confirmLabel={toggleTarget.is_active ? 'Deactivate' : 'Activate'}
          variant={toggleTarget.is_active ? 'destructive' : 'default'}
          onConfirm={() => toggleMutation.mutateAsync(toggleTarget.id)}
        />
      )}
    </SubscriptionWorkspace>
  )
}
