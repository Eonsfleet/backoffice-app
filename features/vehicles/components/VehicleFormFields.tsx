'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { listOrganizations } from '@/features/organizations/api'
import type { Vehicle } from '@/types/api'

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG']
const VEHICLE_STATUSES = ['active', 'inactive', 'under_maintenance', 'in_transit']
const BODY_TYPES = [
  'Sedan', 'Hatchback', 'SUV', 'Pickup', 'Van', 'Minibus', 'Panel Van',
  'Light Truck', 'Medium Truck', 'Heavy Truck', 'Articulated Truck', 'Bus', 'Motorcycle',
]
const FUEL_CAPACITY_UNITS = [
  { value: 'L', label: 'Liters (L)' },
  { value: 'gal', label: 'Gallons (gal)' },
  { value: 'gallons', label: 'Gallons (US)' },
]
const CURRENT_YEAR = new Date().getFullYear()

export const vehicleSchema = z.object({
  registration_number: z.string().min(2, 'Registration number is required'),
  organization_id:     z.string().min(1, 'Organization is required'),
  make:                z.string().optional(),
  model:               z.string().optional(),
  year:                z.number().min(1980).max(CURRENT_YEAR + 1).optional(),
  color:               z.string().optional(),
  body_type:           z.string().optional(),
  fuel_type:           z.string().optional(),
  fuel_capacity:       z.number({ error: 'Fuel tank capacity is required' }).min(1, 'Fuel tank capacity must be greater than 0'),
  fuel_capacity_unit:  z.string().min(1),
  chasis_number:       z.string().optional(),
  status:              z.string().min(1),
})
export type VehicleForm = z.infer<typeof vehicleSchema>

export function VehicleFormFields({
  vehicle,
  onSubmit,
  isPending,
  onCancel,
}: {
  vehicle?: Vehicle | null
  onSubmit: (v: VehicleForm) => void
  isPending: boolean
  onCancel: () => void
}) {
  const [orgSearch, setOrgSearch] = useState('')
  const { data: orgsData, isFetching: orgsFetching } = useQuery({
    queryKey: ['orgs-search', orgSearch],
    queryFn: () => listOrganizations({ q: orgSearch || undefined, per_page: 20 }),
    staleTime: 30_000,
  })

  const orgOptions = (orgsData?.data ?? []).map((o) => ({ value: String(o.identifier ?? o.id), label: o.name }))
  const fuelOptions = FUEL_TYPES.map((f) => ({ value: f, label: f }))
  const bodyTypeOptions = BODY_TYPES.map((b) => ({ value: b, label: b }))
  const statusOptions = VEHICLE_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))

  const { register, handleSubmit, formState: { errors }, setValue, control } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      registration_number: vehicle?.plate_number ?? '',
      organization_id:     vehicle?.organization ? String(vehicle.organization.identifier ?? vehicle.organization.id) : '',
      make:                vehicle?.make ?? '',
      model:               vehicle?.model ?? '',
      year:                vehicle?.year ?? undefined,
      color:               vehicle?.color ?? '',
      body_type:           vehicle?.body_type ?? '',
      fuel_type:           vehicle?.fuel_type ?? '',
      fuel_capacity:       vehicle?.fuel_capacity ?? undefined,
      fuel_capacity_unit:  vehicle?.fuel_capacity_unit ?? 'L',
      chasis_number:       vehicle?.chasis_number ?? '',
      status:              vehicle?.status ?? 'active',
    },
  })
  const organizationId = useWatch({ control, name: 'organization_id' }) ?? ''
  const bodyType = useWatch({ control, name: 'body_type' }) ?? ''
  const fuelType = useWatch({ control, name: 'fuel_type' }) ?? ''
  const fuelCapacityUnit = useWatch({ control, name: 'fuel_capacity_unit' }) ?? 'L'
  const status = useWatch({ control, name: 'status' }) ?? 'active'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5">
      <div className="space-y-1.5">
        <Label>Registration Number *</Label>
        <Input {...register('registration_number')} placeholder="e.g. LSD-101-AA" className="uppercase" />
        {errors.registration_number && <p className="text-xs text-destructive">{errors.registration_number.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Organization *</Label>
        <SearchableSelect
          options={orgOptions}
          value={organizationId}
          onValueChange={(v) => setValue('organization_id', v)}
          placeholder="Select organization…"
          searchPlaceholder="Search organizations…"
          onSearch={setOrgSearch}
          isLoading={orgsFetching}
        />
        {errors.organization_id && <p className="text-xs text-destructive">{errors.organization_id.message}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Make</Label>
          <Input {...register('make')} placeholder="e.g. Toyota" />
        </div>
        <div className="space-y-1.5">
          <Label>Model</Label>
          <Input {...register('model')} placeholder="e.g. Hiace" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Year</Label>
          <Input {...register('year', { valueAsNumber: true })} type="number" min={1980} max={CURRENT_YEAR + 1} placeholder={String(CURRENT_YEAR)} />
        </div>
        <div className="space-y-1.5">
          <Label>Color</Label>
          <Input {...register('color')} placeholder="e.g. White" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Body Type</Label>
          <SearchableSelect
            options={bodyTypeOptions}
            value={bodyType}
            onValueChange={(v) => setValue('body_type', v)}
            placeholder="Select body type…"
            searchPlaceholder="Search…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fuel Type</Label>
          <Select value={fuelType} onValueChange={(v) => setValue('fuel_type', v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select fuel type…" /></SelectTrigger>
            <SelectContent>
              {fuelOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fuel Tank Capacity *</Label>
          <Input
            {...register('fuel_capacity', { valueAsNumber: true })}
            type="number"
            min={1}
            step="any"
            placeholder="e.g. 80"
          />
          {errors.fuel_capacity && <p className="text-xs text-destructive">{errors.fuel_capacity.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Capacity Unit</Label>
          <Select value={fuelCapacityUnit} onValueChange={(v) => setValue('fuel_capacity_unit', v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select unit…" /></SelectTrigger>
            <SelectContent>
              {FUEL_CAPACITY_UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Chassis Number</Label>
          <Input {...register('chasis_number')} placeholder="Chassis / VIN" />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setValue('status', v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select status…" /></SelectTrigger>
            <SelectContent>
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? 'Saving…' : vehicle ? 'Save Changes' : 'Create Vehicle'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
