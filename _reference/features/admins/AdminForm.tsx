import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Minimum 6 characters for password'),
    role: z.enum(['super_admin', 'support', 'installer']),
})
type FormData = z.infer<typeof schema>

interface AdminFormProps {
    defaultValues?: Partial<FormData>
    onSubmit: (data: FormData) => void
    isSubmitting?: boolean
}

export function AdminForm({ defaultValues, onSubmit, isSubmitting }: AdminFormProps) {
    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: defaultValues?.name || '',
            email: defaultValues?.email || '',
            password: '',
            role: defaultValues?.role || 'support',
        }
    })

    // Watch for Select changes
    const role = watch('role')

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                        value={role}
                        onValueChange={(v) => setValue('role', v as any)}
                    >
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                            <SelectItem value="installer">Installer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" {...register('password')} />
                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>
            </div>
            <div className="pt-4 flex justify-end gap-2">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Admin User'}
                </Button>
            </div>
        </form>
    )
}
