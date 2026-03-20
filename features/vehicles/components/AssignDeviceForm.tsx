'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { listDevices, assignDevice } from '@/features/devices/api'
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
  const [deviceId, setDeviceId] = useState('')
  const qc = useQueryClient()

  const { data: devicesData, isLoading } = useQuery({
    queryKey: ['unassigned-devices'],
    queryFn: () => listDevices({ status: 'unassigned', per_page: 100 }),
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: () =>
      assignDevice(deviceId, {
        vehicle_id: vehicle.id,
        organization_id: vehicle.organization!.id,
      }),
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
        <Label>Select Unassigned Device</Label>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading devices…</p>
        ) : devices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No unassigned devices available.</p>
        ) : (
          <SearchableSelect
            options={devices.map((d) => ({
              value: String(d.id),
              label: d.hardware?.name ? `${d.device_id} · ${d.hardware.name}` : d.device_id,
            }))}
            value={deviceId}
            onValueChange={setDeviceId}
            placeholder="Choose a device…"
            searchPlaceholder="Search IMEI or hardware…"
          />
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => mutation.mutate()}
          disabled={!deviceId || mutation.isPending}
          className="flex-1"
        >
          {mutation.isPending ? 'Assigning…' : 'Assign Device'}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
