import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
    imei: z.string().min(10, 'IMEI must be at least 10 characters'),
    serial_number: z.string().min(1, 'Serial number is required'),
    hardware_id: z.number().min(1, 'Hardware model is required'),
    organization_id: z.number().optional(),
})
type FormData = z.infer<typeof schema>

interface DeviceFormProps {
    defaultValues?: Partial<FormData>
    onSubmit: (data: FormData) => void
    isSubmitting?: boolean
}

export function DeviceForm({ defaultValues, onSubmit, isSubmitting }: DeviceFormProps) {
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            imei: defaultValues?.imei || '',
            serial_number: defaultValues?.serial_number || '',
            hardware_id: defaultValues?.hardware_id || 0,
        }
    })

    // Note: hardcoded inputs for hardware/organization ID since we don't have lookup dropdowns prepared yet
    return (
        <form onSubmit={handleSubmit((d) => onSubmit({ ...d, hardware_id: Number(d.hardware_id), organization_id: d.organization_id ? Number(d.organization_id) : undefined }))} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="imei">IMEI</Label>
                <Input id="imei" {...register('imei')} />
                {errors.imei && <p className="text-xs text-red-500">{errors.imei.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input id="serial_number" {...register('serial_number')} />
                {errors.serial_number && <p className="text-xs text-red-500">{errors.serial_number.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="hardware_id">Hardware ID</Label>
                <Input id="hardware_id" type="number" {...register('hardware_id', { valueAsNumber: true })} />
                <p className="text-xs text-gray-500">Provide the numeric ID of the compatible hardware model.</p>
                {errors.hardware_id && <p className="text-xs text-red-500">{errors.hardware_id.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="organization_id">Organization ID (Optional if unassigned)</Label>
                <Input id="organization_id" type="number" {...register('organization_id', { valueAsNumber: true })} />
            </div>
            <div className="pt-4 flex justify-end gap-2">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Device'}
                </Button>
            </div>
        </form>
    )
}
