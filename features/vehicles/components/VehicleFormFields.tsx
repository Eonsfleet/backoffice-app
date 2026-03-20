'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { listOrganizations } from '@/features/organizations/api'
import type { Vehicle } from '@/types/api'

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG']
const VEHICLE_STATUSES = ['active', 'inactive', 'maintenance', 'in_transit']
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

  const orgOptions = (orgsData?.data ?? []).map((o) => ({ value: String(o.id), label: o.name }))
  const fuelOptions = FUEL_TYPES.map((f) => ({ value: f, label: f }))
  const statusOptions = VEHICLE_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      registration_number: vehicle?.plate_number ?? '',
      organization_id:     vehicle?.organization ? String(vehicle.organization.id) : '',
      make:                vehicle?.make ?? '',
      model:               vehicle?.model ?? '',
      year:                vehicle?.year ?? undefined,
      color:               vehicle?.color ?? '',
      body_type:           vehicle?.body_type ?? '',
      fuel_type:           vehicle?.fuel_type ?? '',
      chasis_number:       vehicle?.chasis_number ?? '',
      status:              vehicle?.status ?? 'active',
    },
  })

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
          value={watch('organization_id')}
          onValueChange={(v) => setValue('organization_id', v)}
          placeholder="Select organization…"
          searchPlaceholder="Search organizations…"
          onSearch={setOrgSearch}
          isLoading={orgsFetching}
        />
        {errors.organization_id && <p className="text-xs text-destructive">{errors.organization_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Make</Label>
          <Input {...register('make')} placeholder="e.g. Toyota" />
        </div>
        <div className="space-y-1.5">
          <Label>Model</Label>
          <Input {...register('model')} placeholder="e.g. Hiace" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Year</Label>
          <Input {...register('year', { valueAsNumber: true })} type="number" min={1980} max={CURRENT_YEAR + 1} placeholder={String(CURRENT_YEAR)} />
        </div>
        <div className="space-y-1.5">
          <Label>Color</Label>
          <Input {...register('color')} placeholder="e.g. White" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Body Type</Label>
          <Input {...register('body_type')} placeholder="e.g. Truck, SUV, Sedan" />
        </div>
        <div className="space-y-1.5">
          <Label>Fuel Type</Label>
          <SearchableSelect
            options={fuelOptions}
            value={watch('fuel_type') ?? ''}
            onValueChange={(v) => setValue('fuel_type', v)}
            placeholder="Select fuel type…"
            searchPlaceholder="Search…"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Chassis Number</Label>
          <Input {...register('chasis_number')} placeholder="Chassis / VIN" />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <SearchableSelect
            options={statusOptions}
            value={watch('status')}
            onValueChange={(v) => setValue('status', v)}
            placeholder="Select status…"
            searchPlaceholder="Search…"
          />
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
