'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Apn } from '@/types/api'

const schema = z.object({
  name:   z.string().min(1, 'Name is required'),
  status: z.number().int(),
})

export type ApnFormValues = z.infer<typeof schema>

export function ApnForm({
  apn,
  onSubmit,
  isPending,
  onCancel,
}: {
  apn?: Apn | null
  onSubmit: (v: ApnFormValues) => void
  isPending: boolean
  onCancel: () => void
}) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<ApnFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:   apn?.name   ?? '',
      status: apn?.status ?? 1,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-5">
      <div className="space-y-1.5">
        <Label>APN Name *</Label>
        <Input {...register('name')} placeholder="e.g. MTN Nigeria" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">Enable this APN for device assignment</p>
            </div>
            <Switch
              checked={field.value === 1}
              onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
            />
          </div>
        )}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {apn ? 'Save Changes' : 'Create APN'}
        </Button>
      </div>
    </form>
  )
}
