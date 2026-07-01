import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { uploadFile } from '@/api/client'
import { ImagePlus, Loader2 } from 'lucide-react'

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    industry: z.string().min(1, 'Industry is required'),
    fleet_size: z.number().min(1, 'Fleet size must be greater than 0'),
    phone: z.string().min(1, 'Phone number is required'),
    logo: z.string().optional(),
    domain: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface OrganizationFormProps {
    defaultValues?: Partial<FormData>
    onSubmit: (data: FormData & { slug: string }) => void
    isSubmitting?: boolean
}

const generateSlug = (name: string) =>
    name.toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')

export function OrganizationForm({ defaultValues, onSubmit, isSubmitting }: OrganizationFormProps) {
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: defaultValues?.name || '',
            email: defaultValues?.email || '',
            industry: defaultValues?.industry || '',
            fleet_size: defaultValues?.fleet_size || 0,
            phone: defaultValues?.phone || '',
            logo: defaultValues?.logo || '',
            domain: defaultValues?.domain || '',
        }
    })

    const [isUploading, setIsUploading] = useState(false)
    const logoUrl = watch('logo')

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            const uploadedUrl = await uploadFile(file)
            setValue('logo', uploadedUrl)
            toast.success('Logo uploaded successfully')
        } catch (error) {
            toast.error('Failed to upload logo')
            console.error(error)
        } finally {
            setIsUploading(false)
        }
    }

    const handleFormSubmit = (d: FormData) => {
        onSubmit({
            ...d,
            slug: generateSlug(d.name)
        })
    }

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Organization Name</Label>
                    <Input id="name" {...register('name')} />
                    {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register('email')} />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input id="industry" {...register('industry')} />
                    {errors.industry && <p className="text-xs text-red-500">{errors.industry.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="fleet_size">Fleet Size</Label>
                    <Input id="fleet_size" type="number" {...register('fleet_size', { valueAsNumber: true })} />
                    {errors.fleet_size && <p className="text-xs text-red-500">{errors.fleet_size.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...register('phone')} />
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="domain">Custom Domain</Label>
                    <Input id="domain" {...register('domain')} placeholder="e.g. app.org1.com" />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                    {logoUrl ? (
                        <div className="relative h-16 w-16 overflow-hidden rounded-md border">
                            <img src={logoUrl} alt="Logo" className="object-cover h-full w-full" />
                        </div>
                    ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed bg-gray-50">
                            <ImagePlus className="h-6 w-6 text-gray-400" />
                        </div>
                    )}

                    <div className="flex-1">
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                            className="hidden"
                            id="logo-upload"
                        />
                        <Label
                            htmlFor="logo-upload"
                            className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isUploading ? 'Uploading...' : 'Choose File'}
                        </Label>
                    </div>
                </div>
                <p className="text-xs text-gray-500">Recommended size: 256x256px.</p>
                {/* Hidden input to keep it registered but let the file uploader handle state via setValue */}
                <input type="hidden" {...register('logo')} />
            </div>

            <div className="pt-4 flex justify-end gap-2">
                <Button type="submit" disabled={isSubmitting || isUploading}>
                    {isSubmitting ? 'Saving...' : 'Save Organization'}
                </Button>
            </div>
        </form>
    )
}
