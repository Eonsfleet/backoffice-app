import { useState } from 'react'
import { usePlans, useCreatePlan } from './hooks'
import { PlanForm } from './PlanForm'
import { PageError } from '@/components/shared/PageError'
import { Can } from '@/components/shared/Can'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

export default function PlansPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const { data: plans, isLoading, isError } = usePlans()
    const createPlan = useCreatePlan()

    if (isError) return <PageError message="Failed to load subscription plans." />

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Subscription Plans</h1>
                <Can permission="manage_subscriptions">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> New Plan</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Plan</DialogTitle>
                            </DialogHeader>
                            <PlanForm
                                onSubmit={(formData) => {
                                    createPlan.mutate(formData, {
                                        onSuccess: () => setIsDialogOpen(false)
                                    })
                                }}
                                isSubmitting={createPlan.isPending}
                            />
                        </DialogContent>
                    </Dialog>
                </Can>
            </div>

            {isLoading ? (
                <div className="text-gray-500">Loading plans...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(plans || []).map((plan) => (
                        <Card key={plan.id}>
                            <CardHeader>
                                <CardTitle className="text-lg">{plan.name}</CardTitle>
                                <p className="text-2xl font-bold">${plan.price} <span className="text-sm font-normal text-gray-500">/ {plan.billing_cycle}</span></p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-gray-600">Max Vehicles: {plan.vehicle_limit}</p>
                                <div>
                                    <p className="text-sm font-semibold mb-2">Features:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {plan.features?.map(f => <Badge key={f.id} variant="secondary">{f.name}</Badge>)}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
