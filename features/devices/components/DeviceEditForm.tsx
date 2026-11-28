'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { updateDevice, listHardware } from '@/features/devices/api'
import { listOrganizations } from '@/features/organizations/api'
import { COUNTRIES, COUNTRY_OPTIONS } from '@/features/devices/components/DeviceCreateForm'
import { cn } from '@/lib/utils'
import type { Device } from '@/types/api'

const editDeviceSchema = z.object({
  imei:            z.string().min(6, 'IMEI / serial is required (min 6 chars)'),
  hardware_id:     z.string().min(1, 'Hardware model is required'),
  phone_number:    z.string().min(1, 'Phone number is required'),
  country:         z.string().min(1, 'Country is required'),
  organization_id: z.string().min(1, 'Organization is required'),
  status:          z.boolean(),
  has_fuel:        z.boolean(),
})
type EditDeviceForm = z.infer<typeof editDeviceSchema>

/** The API may hold either a country code ("NG") or a name ("Nigeria"); the form uses codes. */
function toCountryCode(value?: string | null): string {
  if (!value) return ''
  const v = value.trim().toLowerCase()
  return COUNTRIES.find((c) => c.code.toLowerCase() === v || c.name.toLowerCase() === v)?.code ?? ''
}

interface DeviceEditFormProps {
  device: Device
  onSuccess: () => void
  onCancel: () => void
  className?: string
}

export function DeviceEditForm({ device, onSuccess, onCancel, className = 'px-5' }: DeviceEditFormProps) {
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
  const orgOptions      = (orgsData?.data   ?? []).map((o) => ({ value: String(o.identifier ?? o.id), label: o.name }))

  const { register, handleSubmit, setValue, control, formState: { errors, isDirty } } = useForm<EditDeviceForm>({
    resolver: zodResolver(editDeviceSchema),
    defaultValues: {
      imei:            device.device_id ?? '',
      hardware_id:     device.hardware ? String(device.hardware.id) : '',
      phone_number:    device.phone_number ?? '',
      country:         toCountryCode(device.country),
      organization_id: device.organization ? String(device.organization.id) : '',
      status:          device.is_active ?? true,
      has_fuel:        device.has_fuel ?? false,
    },
  })
  const selectedHardware     = useWatch({ control, name: 'hardware_id' }) ?? ''
  const selectedCountry      = useWatch({ control, name: 'country' }) ?? ''
  const selectedOrganization = useWatch({ control, name: 'organization_id' }) ?? ''
  const isActive             = useWatch({ control, name: 'status' })
  const hasFuel              = useWatch({ control, name: 'has_fuel' })

  const mutation = useMutation({
    mutationFn: (values: EditDeviceForm) =>
      updateDevice(device.id, { ...values, device_id: device.id }),
    onSuccess: () => {
      toast.success('Device updated')
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['device', String(device.id)] })
      onSuccess()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to update device')
    },
  })

  const setDirty = { shouldValidate: true, shouldDirty: true } as const

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className={cn('space-y-4', className)}>
      <div className="space-y-1.5">
        <Label>IMEI / Device ID *</Label>
        <Input {...register('imei')} placeholder="e.g. 356938035643809" className="font-mono" />
        {errors.imei && <p className="text-xs text-destructive">{errors.imei.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Hardware Model *</Label>
        <SearchableSelect
          options={hardwareOptions}
          value={selectedHardware}
          onValueChange={(v) => setValue('hardware_id', v, setDirty)}
          placeholder="Select hardware model"
          searchPlaceholder="Search hardware…"
        />
        {errors.hardware_id && <p className="text-xs text-destructive">{errors.hardware_id.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Country *</Label>
        <SearchableSelect
          options={COUNTRY_OPTIONS}
          value={selectedCountry}
          onValueChange={(v) => setValue('country', v, setDirty)}
          placeholder="Select country"
          searchPlaceholder="Search country…"
        />
        {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>SIM / Phone Number *</Label>
        <Input {...register('phone_number')} placeholder="+234…" />
        {errors.phone_number && <p className="text-xs text-destructive">{errors.phone_number.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Organization *</Label>
        <SearchableSelect
          options={orgOptions}
          value={selectedOrganization}
          onValueChange={(v) => setValue('organization_id', v, setDirty)}
          placeholder="Select organization"
          searchPlaceholder="Search organizations…"
        />
        {errors.organization_id && <p className="text-xs text-destructive">{errors.organization_id.message}</p>}
      </div>

      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
        <div>
          <Label htmlFor="device-active">Active</Label>
          <p className="text-xs text-muted-foreground">Inactive devices stop reporting.</p>
        </div>
        <Switch id="device-active" checked={isActive} onCheckedChange={(v) => setValue('status', v, setDirty)} />
      </div>

      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
        <div>
          <Label htmlFor="device-fuel">Has fuel sensor</Label>
          <p className="text-xs text-muted-foreground">Enables fuel readings for this device.</p>
        </div>
        <Switch id="device-fuel" checked={hasFuel} onCheckedChange={(v) => setValue('has_fuel', v, setDirty)} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending || !isDirty} className="flex-1">
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>Cancel</Button>
      </div>
    </form>
  )
}
