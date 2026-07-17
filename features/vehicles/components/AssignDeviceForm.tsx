'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { listDevices } from '@/features/devices/api'
import { assignDeviceToVehicle } from '@/features/vehicles/api'
import type { Vehicle } from '@/types/api'

export function AssignDeviceForm({
  vehicle,
  onSuccess,
  onCancel,
}: {
  vehicle: Vehicle
  onSuccess: () => void
  onCancel: () => void
}) {
  const [deviceImei, setDeviceImei] = useState('')
  const [deviceSearch, setDeviceSearch] = useState('')
  const qc = useQueryClient()

  const { data: devicesData, isLoading, isFetching } = useQuery({
    queryKey: ['assignable-devices', deviceSearch],
    queryFn: () => listDevices({ per_page: 100, q: deviceSearch || undefined }),
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: () => assignDeviceToVehicle(vehicle.id, deviceImei),
    onSuccess: () => {
      toast.success('Device assigned successfully')
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['vehicle-metrics'] })
      onSuccess()
    },
    onError: () => toast.error('Failed to assign device'),
  })

  const devices = devicesData?.data ?? []

  return (
    <div className="space-y-5">
      {/* Current device info */}
      {vehicle.device_id && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-300">Currently assigned device</p>
          <p className="mt-0.5 font-mono text-amber-700 dark:text-amber-400">{vehicle.device_id}</p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Assigning a new device will replace it.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Select Device</Label>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading devices…</p>
        ) : (
          <SearchableSelect
            options={devices.map((d) => ({
              value: d.device_id,
              label: [
                d.device_id,
                d.hardware?.name,
                d.organization?.name,
                d.vehicle ? `assigned to ${d.vehicle.plate_number}` : 'unassigned',
              ].filter(Boolean).join(' · '),
            }))}
            value={deviceImei}
            onValueChange={setDeviceImei}
            placeholder="Choose a device…"
            searchPlaceholder="Search IMEI or hardware…"
            onSearch={setDeviceSearch}
            isLoading={isFetching}
          />
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => mutation.mutate()}
          disabled={!deviceImei || mutation.isPending}
          className="flex-1"
        >
          {mutation.isPending ? 'Assigning…' : 'Assign Device'}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
