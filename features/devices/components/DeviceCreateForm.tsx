'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { createDevice, listHardware } from '@/features/devices/api'
import { listOrganizations } from '@/features/organizations/api'

export const createDeviceSchema = z.object({
  device_id:       z.string().min(6, 'IMEI / serial is required'),
  hardware_id:     z.string().optional(),
  phone_number:    z.string().optional(),
  country:         z.string().optional(),
  organization_id: z.string().optional(),
})
export type CreateDeviceForm = z.infer<typeof createDeviceSchema>

export function DeviceCreateForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const qc = useQueryClient()

  const { data: hardwareList } = useQuery({
    queryKey: ['hardware-list'],
    queryFn: () => listHardware({ per_page: 100 }),
    staleTime: 300_000,
  })

  const { data: orgsData } = useQuery({
    queryKey: ['orgs-dropdown'],
    queryFn: () => listOrganizations({ per_page: 100 }),
    staleTime: 120_000,
  })

  const hardwareOptions = (hardwareList?.data ?? []).map((h) => ({ value: String(h.id), label: h.name }))
  const orgOptions = (orgsData?.data ?? []).map((o) => ({ value: String(o.id), label: o.name }))

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateDeviceForm>({
    resolver: zodResolver(createDeviceSchema),
  })

  const mutation = useMutation({
    mutationFn: (values: CreateDeviceForm) =>
      createDevice({
        imei:       values.device_id,
        hardware_id:     values.hardware_id || undefined,
        phone_number:    values.phone_number || undefined,
        country:         values.country || undefined,
        organization_id: values.organization_id || undefined,
      }),
    onSuccess: () => {
      toast.success('Device created')
      qc.invalidateQueries({ queryKey: ['devices'] })
      onSuccess()
    },
    onError: () => toast.error('Failed to create device'),
  })

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 px-5">
      <div className="space-y-1.5">
        <Label>IMEI / Device ID *</Label>
        <Input {...register('device_id')} placeholder="e.g. 356938035643809" className="font-mono" />
        {errors.device_id && <p className="text-xs text-destructive">{errors.device_id.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Hardware Model</Label>
        <SearchableSelect
          options={hardwareOptions}
          value={watch('hardware_id') ?? ''}
          onValueChange={(v) => setValue('hardware_id', v)}
          placeholder="Select hardware (optional)"
          searchPlaceholder="Search hardware…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>SIM / Phone Number</Label>
          <Input {...register('phone_number')} placeholder="+234…" />
        </div>
        <div className="space-y-1.5">
          <Label>Country</Label>
          <Input {...register('country')} placeholder="e.g. NG" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Organization</Label>
        <SearchableSelect
          options={orgOptions}
          value={watch('organization_id') ?? ''}
          onValueChange={(v) => setValue('organization_id', v)}
          placeholder="Assign to organization (optional)"
          searchPlaceholder="Search organizations…"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending} className="flex-1">
          {mutation.isPending ? 'Creating…' : 'Create Device'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
