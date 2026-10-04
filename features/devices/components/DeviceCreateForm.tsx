'use client'

import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { createDevice, listHardware } from '@/features/devices/api'
import { cn } from '@/lib/utils'
import type { Device } from '@/types/api'
import { listOrganizations } from '@/features/organizations/api'

// ─── Countries ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'NG', name: 'Nigeria',               dial: '+234' },
  { code: 'GH', name: 'Ghana',                dial: '+233' },
  { code: 'KE', name: 'Kenya',                dial: '+254' },
  { code: 'ZA', name: 'South Africa',         dial: '+27'  },
  { code: 'EG', name: 'Egypt',                dial: '+20'  },
  { code: 'ET', name: 'Ethiopia',             dial: '+251' },
  { code: 'TZ', name: 'Tanzania',             dial: '+255' },
  { code: 'UG', name: 'Uganda',               dial: '+256' },
  { code: 'RW', name: 'Rwanda',               dial: '+250' },
  { code: 'SN', name: 'Senegal',              dial: '+221' },
  { code: 'CI', name: "Côte d'Ivoire",        dial: '+225' },
  { code: 'CM', name: 'Cameroon',             dial: '+237' },
  { code: 'AO', name: 'Angola',               dial: '+244' },
  { code: 'MZ', name: 'Mozambique',           dial: '+258' },
  { code: 'ZM', name: 'Zambia',               dial: '+260' },
  { code: 'ZW', name: 'Zimbabwe',             dial: '+263' },
  { code: 'BW', name: 'Botswana',             dial: '+267' },
  { code: 'NA', name: 'Namibia',              dial: '+264' },
  { code: 'MA', name: 'Morocco',              dial: '+212' },
  { code: 'TN', name: 'Tunisia',              dial: '+216' },
  { code: 'DZ', name: 'Algeria',              dial: '+213' },
  { code: 'LY', name: 'Libya',                dial: '+218' },
  { code: 'SD', name: 'Sudan',                dial: '+249' },
  { code: 'SS', name: 'South Sudan',          dial: '+211' },
  { code: 'ML', name: 'Mali',                 dial: '+223' },
  { code: 'BF', name: 'Burkina Faso',         dial: '+226' },
  { code: 'NE', name: 'Niger',                dial: '+227' },
  { code: 'TD', name: 'Chad',                 dial: '+235' },
  { code: 'MR', name: 'Mauritania',           dial: '+222' },
  { code: 'GM', name: 'Gambia',               dial: '+220' },
  { code: 'GN', name: 'Guinea',               dial: '+224' },
  { code: 'SL', name: 'Sierra Leone',         dial: '+232' },
  { code: 'LR', name: 'Liberia',              dial: '+231' },
  { code: 'BJ', name: 'Benin',                dial: '+229' },
  { code: 'TG', name: 'Togo',                 dial: '+228' },
  { code: 'GA', name: 'Gabon',                dial: '+241' },
  { code: 'CG', name: 'Congo',                dial: '+242' },
  { code: 'CD', name: 'DR Congo',             dial: '+243' },
  { code: 'SO', name: 'Somalia',              dial: '+252' },
  { code: 'MG', name: 'Madagascar',           dial: '+261' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { code: 'SA', name: 'Saudi Arabia',         dial: '+966' },
  { code: 'IN', name: 'India',                dial: '+91'  },
  { code: 'CN', name: 'China',                dial: '+86'  },
  { code: 'US', name: 'United States',        dial: '+1'   },
  { code: 'GB', name: 'United Kingdom',       dial: '+44'  },
  { code: 'CA', name: 'Canada',               dial: '+1'   },
  { code: 'AU', name: 'Australia',            dial: '+61'  },
  { code: 'DE', name: 'Germany',              dial: '+49'  },
  { code: 'FR', name: 'France',               dial: '+33'  },
  { code: 'IT', name: 'Italy',                dial: '+39'  },
  { code: 'ES', name: 'Spain',                dial: '+34'  },
  { code: 'PT', name: 'Portugal',             dial: '+351' },
  { code: 'BR', name: 'Brazil',               dial: '+55'  },
  { code: 'MX', name: 'Mexico',               dial: '+52'  },
  { code: 'JP', name: 'Japan',                dial: '+81'  },
] as const

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.name} (${c.dial})`,
}))

// ─── Schema ───────────────────────────────────────────────────────────────────

export const createDeviceSchema = z.object({
  device_id:       z.string().min(6, 'IMEI / serial is required (min 6 chars)'),
  hardware_id:     z.string().min(1, 'Hardware model is required'),
  phone_number:    z.string().min(1, 'Phone number is required'),
  country:         z.string().min(1, 'Country is required'),
  organization_id: z.string().min(1, 'Organization is required'),
})
export type CreateDeviceForm = z.infer<typeof createDeviceSchema>

// ─── Component ────────────────────────────────────────────────────────────────

interface DeviceCreateFormProps {
  onSuccess: (device: Device) => void
  onCancel: () => void
  /** Fixes the IMEI (e.g. one the admin already typed elsewhere). */
  imei?: string
  /** Fixes the organization (`id` is the identifier the API expects) and hides the picker. */
  organization?: { id: string | number; name: string }
  submitLabel?: string
  cancelLabel?: string
  /** Keeps the form locked while the caller finishes follow-up work. */
  busy?: boolean
  className?: string
}

export function DeviceCreateForm({
  onSuccess, onCancel, imei, organization, submitLabel = 'Create Device', cancelLabel = 'Cancel', busy = false, className = 'px-5',
}: DeviceCreateFormProps) {
  const qc = useQueryClient()
  const prevDialRef = useRef<string>('')

  const { data: hardwareList } = useQuery({
    queryKey: ['hardware-list'],
    queryFn: () => listHardware({ per_page: 100 }),
    staleTime: 300_000,
  })

  const { data: orgsData } = useQuery({
    queryKey: ['orgs-dropdown'],
    queryFn: () => listOrganizations({ per_page: 100 }),
    staleTime: 120_000,
    enabled: !organization,
  })

  const hardwareOptions = (hardwareList?.data ?? []).map((h) => ({ value: String(h.id), label: h.name }))
  const orgOptions      = (orgsData?.data   ?? []).map((o) => ({ value: String(o.identifier ?? o.id), label: o.name }))

  const { register, handleSubmit, setValue, getValues, control, formState: { errors } } = useForm<CreateDeviceForm>({
    resolver: zodResolver(createDeviceSchema),
    defaultValues: { device_id: imei ?? '', organization_id: organization ? String(organization.id) : '' },
  })
  const selectedHardware = useWatch({ control, name: 'hardware_id' }) ?? ''
  const selectedCountry = useWatch({ control, name: 'country' }) ?? ''
  const selectedOrganization = useWatch({ control, name: 'organization_id' }) ?? ''

  const handleCountryChange = (code: string) => {
    setValue('country', code, { shouldValidate: true })
    const country = COUNTRIES.find((c) => c.code === code)
    if (!country) return
    const newDial  = country.dial
    const prevDial = prevDialRef.current
    const phone    = getValues('phone_number') ?? ''
    if (phone === '' || phone === prevDial) {
      setValue('phone_number', newDial, { shouldValidate: true })
    } else if (prevDial && phone.startsWith(prevDial)) {
      setValue('phone_number', newDial + phone.slice(prevDial.length), { shouldValidate: true })
    }
    prevDialRef.current = newDial
  }

  const mutation = useMutation({
    mutationFn: (values: CreateDeviceForm) =>
      createDevice({
        imei:            values.device_id,
        hardware_id:     values.hardware_id,
        phone_number:    values.phone_number,
        country:         values.country,
        organization_id: values.organization_id,
      }),
    onSuccess: (device, values) => {
      toast.success('Device created successfully')
      qc.invalidateQueries({ queryKey: ['devices'] })
      onSuccess({ ...device, device_id: device.device_id || values.device_id })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to create device')
    },
  })

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className={cn('space-y-4', className)}>
      <div className="space-y-1.5">
        <Label>IMEI / Device ID *</Label>
        <Input {...register('device_id')} placeholder="e.g. 356938035643809" className={cn('font-mono', imei && 'bg-muted text-muted-foreground')} readOnly={!!imei} />
        {errors.device_id && <p className="text-xs text-destructive">{errors.device_id.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Hardware Model *</Label>
        <SearchableSelect
          options={hardwareOptions}
          value={selectedHardware}
          onValueChange={(v) => setValue('hardware_id', v, { shouldValidate: true })}
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
          onValueChange={handleCountryChange}
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
        <Label>Organization{organization ? '' : ' *'}</Label>
        {organization ? <Input value={organization.name} disabled readOnly /> : (
          <SearchableSelect
            options={orgOptions}
            value={selectedOrganization}
            onValueChange={(v) => setValue('organization_id', v, { shouldValidate: true })}
            placeholder="Select organization"
            searchPlaceholder="Search organizations…"
          />
        )}
        {errors.organization_id && <p className="text-xs text-destructive">{errors.organization_id.message}</p>}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending || busy} className="flex-1">
          {mutation.isPending ? 'Creating…' : busy ? 'Assigning…' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending || busy}>{cancelLabel}</Button>
      </div>
    </form>
  )
}
