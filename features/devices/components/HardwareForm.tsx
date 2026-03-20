'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { Hardware } from '@/types/api'

const schema = z.object({
  name:        z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  status:      z.boolean().optional(),
  apn_id:      z.number().optional(),
})

export type HardwareFormValues = z.infer<typeof schema>

interface HardwareFormProps {
  hardware?:  Hardware | null
  onSubmit:   (v: HardwareFormValues) => void
  isPending:  boolean
  onCancel:   () => void
}

export function HardwareForm({ hardware, onSubmit, isPending, onCancel }: HardwareFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<HardwareFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        hardware?.name        ?? '',
      description: hardware?.description ?? '',
      status:      hardware?.status      ?? true,
      apn_id:      hardware?.apn_id      ?? undefined,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-5">
      <div className="space-y-1.5">
        <Label>Name *</Label>
        <Input {...register('name')} placeholder="e.g. Teltonika FMB920" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        <p className="text-xs text-muted-foreground">A URL-friendly slug is auto-generated from the name.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input {...register('description')} placeholder="e.g. 4G LTE GPS tracker with Bluetooth" />
      </div>

      <div className="space-y-1.5">
        <Label>APN ID</Label>
        <Input
          {...register('apn_id', { valueAsNumber: true })}
          type="number"
          min={1}
          placeholder="Optional APN record ID"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Active</p>
          <p className="text-xs text-muted-foreground">Enable this hardware model for device assignment</p>
        </div>
        <Switch
          checked={watch('status') ?? true}
          onCheckedChange={(v) => setValue('status', v)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {hardware ? 'Save Changes' : 'Create Hardware'}
        </Button>
      </div>
    </form>
  )
}
