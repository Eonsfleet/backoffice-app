'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, PlusCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { listDevices } from '@/features/devices/api'
import { DeviceCreateForm } from '@/features/devices/components/DeviceCreateForm'
import { assignDeviceToVehicle } from '@/features/vehicles/api'
import type { Vehicle } from '@/types/api'

const MIN_IMEI_LENGTH = 6

function apiMessage(err: unknown) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message
}

export function AssignDeviceForm({
  vehicle,
  onSuccess,
  onCancel,
  cancelLabel = 'Cancel',
}: {
  vehicle: Vehicle
  onSuccess: () => void
  onCancel: () => void
  cancelLabel?: string
}) {
  const [imei, setImei] = useState('')
  const [creating, setCreating] = useState(false)
  const qc = useQueryClient()

  const term = imei.trim()
  const debouncedTerm = useDebounce(term, 300)
  const { data: devicesData, isFetching } = useQuery({
    queryKey: ['assignable-devices', debouncedTerm],
    queryFn: () => listDevices({ per_page: 10, q: debouncedTerm }),
    enabled: debouncedTerm.length >= 3,
    staleTime: 30_000,
  })
  const devices = debouncedTerm.length >= 3 ? devicesData?.data ?? [] : []
  const match = devices.find((d) => d.device_id === term)
  // Only call a device missing once the search for exactly this IMEI has settled.
  const settled = debouncedTerm === term && !isFetching
  const missing = settled && !match && term.length >= MIN_IMEI_LENGTH

  const organization = vehicle.organization
    ? { id: vehicle.organization.identifier ?? vehicle.organization.id, name: vehicle.organization.name }
    : undefined

  const mutation = useMutation({
    mutationFn: (deviceImei: string) => assignDeviceToVehicle(vehicle.id, deviceImei),
    onSuccess: () => {
      toast.success('Device assigned successfully')
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['vehicle-metrics'] })
      qc.invalidateQueries({ queryKey: ['devices'] })
      onSuccess()
    },
    onError: (err) => {
      toast.error(apiMessage(err) ?? 'Failed to assign device')
      // A device created a moment ago now exists; drop back to the search so
      // the admin can retry the assignment instead of creating it twice.
      setCreating(false)
      qc.invalidateQueries({ queryKey: ['assignable-devices'] })
    },
  })

  if (creating) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium">Create device <span className="font-mono">{term}</span></p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            It will be assigned to {vehicle.plate_number} as soon as it is created.
          </p>
        </div>
        <DeviceCreateForm
          className=""
          imei={term}
          organization={organization}
          submitLabel="Create & Assign"
          cancelLabel="Back"
          busy={mutation.isPending}
          onSuccess={(device) => mutation.mutate(device.device_id)}
          onCancel={() => setCreating(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {vehicle.device_id && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-300">Currently assigned device</p>
          <p className="mt-0.5 font-mono text-amber-700 dark:text-amber-400">{vehicle.device_id}</p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Assigning a new device will replace it.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="assign-device-imei">Device IMEI</Label>
        <div className="relative">
          <Input
            id="assign-device-imei"
            value={imei}
            onChange={(e) => setImei(e.target.value)}
            placeholder="e.g. 356938035643809"
            className="pr-8 font-mono"
            autoComplete="off"
            autoFocus
          />
          {isFetching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground">Type an IMEI to find a device. If it doesn&apos;t exist yet, you can create it here.</p>
      </div>

      {devices.length > 0 && (
        <ul className="divide-y rounded-md border text-sm" aria-label="Matching devices">
          {devices.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setImei(d.device_id)}
                className={cn('w-full px-3 py-2 text-left hover:bg-muted', d.device_id === term && 'bg-muted')}
              >
                <span className="font-mono">{d.device_id}</span>
                <span className="block text-xs text-muted-foreground">
                  {[d.hardware?.name, d.organization?.name, d.vehicle ? `assigned to ${d.vehicle.plate_number}` : 'unassigned']
                    .filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {missing && (
        <div className="rounded-lg border border-dashed p-3 text-sm">
          <p className="font-medium">No device with IMEI <span className="font-mono">{term}</span></p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Create it now and it will be assigned to {vehicle.plate_number} automatically.
          </p>
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setCreating(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create device
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => match && mutation.mutate(match.device_id)}
          disabled={!match || mutation.isPending}
          className="flex-1"
        >
          {mutation.isPending ? 'Assigning…' : 'Assign Device'}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={mutation.isPending}>{cancelLabel}</Button>
      </div>
    </div>
  )
}
