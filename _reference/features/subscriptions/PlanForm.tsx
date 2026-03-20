import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    price: z.number().min(0, 'Price must be 0 or greater'),
    billing_cycle: z.enum(['monthly', 'yearly']),
    vehicle_limit: z.number().min(1, 'Limit must be at least 1')
})
type FormData = z.infer<typeof schema>

interface PlanFormProps {
    defaultValues?: Partial<FormData>
    onSubmit: (data: FormData) => void
    isSubmitting?: boolean
}

export function PlanForm({ defaultValues, onSubmit, isSubmitting }: PlanFormProps) {
    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: defaultValues?.name || '',
            price: defaultValues?.price || 0,
            billing_cycle: defaultValues?.billing_cycle || 'monthly',
            vehicle_limit: defaultValues?.vehicle_limit || 1,
        }
    })

    // Watch for the Select component binding since it bypasses direct register
    const billingCycle = watch('billing_cycle')

    return (
        <form onSubmit={handleSubmit((d) => onSubmit({ ...d, price: Number(d.price), vehicle_limit: Number(d.vehicle_limit) }))} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input id="name" {...register('name')} placeholder="e.g. Pro Plan" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="price">Price (USD)</Label>
                    <Input id="price" type="number" step="0.01" {...register('price', { valueAsNumber: true })} />
                    {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="billing_cycle">Billing Cycle</Label>
                    <Select
                        value={billingCycle}
                        onValueChange={(v) => setValue('billing_cycle', v as 'monthly' | 'yearly')}
                    >
                        <SelectTrigger><SelectValue placeholder="Select cycle" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="vehicle_limit">Vehicle Limit</Label>
                <Input id="vehicle_limit" type="number" {...register('vehicle_limit', { valueAsNumber: true })} />
                {errors.vehicle_limit && <p className="text-xs text-red-500">{errors.vehicle_limit.message}</p>}
            </div>
            <div className="pt-4 flex justify-end gap-2">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Plan'}
                </Button>
            </div>
        </form>
    )
}
