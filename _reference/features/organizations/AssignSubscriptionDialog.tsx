import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePlans } from '@/features/subscriptions/hooks'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const schema = z.object({
    plan_id: z.string().min(1, 'Please select a plan'),
})
type FormData = z.infer<typeof schema>

interface AssignSubscriptionDialogProps {
    organizationId: number
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function AssignSubscriptionDialog({ organizationId, isOpen, onOpenChange, onSuccess }: AssignSubscriptionDialogProps) {
    const { data: plans, isLoading: isLoadingPlans } = usePlans()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
    })

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true)
        try {
            // TODO: Replace with the actual API Call once endpoint is provided!
            console.log('Would assign plan', data.plan_id, 'to org', organizationId)

            // Simulating API success for now
            await new Promise(resolve => setTimeout(resolve, 800))

            toast.success('Subscription plan successfully assigned.')
            onOpenChange(false)
            reset()
            onSuccess?.()
        } catch (error) {
            toast.error('Failed to assign subscription.')
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Subscription Plan</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="plan_id">Select Plan</Label>
                        {isLoadingPlans ? (
                            <div className="text-sm text-gray-500">Loading plans...</div>
                        ) : (
                            <select
                                id="plan_id"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...register('plan_id')}
                            >
                                <option value="">-- Choose a plan --</option>
                                {plans?.map(plan => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.name} (${plan.price} / {plan.billing_cycle})
                                    </option>
                                ))}
                            </select>
                        )}
                        {errors.plan_id && <p className="text-xs text-red-500">{errors.plan_id.message}</p>}
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || isLoadingPlans}>
                            {isSubmitting ? 'Saving...' : 'Save Subscription'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
