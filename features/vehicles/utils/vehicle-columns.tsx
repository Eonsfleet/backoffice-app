import { format } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import {
  CircleDashed, Cpu, Link2Off, MoreHorizontal, Pencil, Trash2, Truck,
} from 'lucide-react'

import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeviceStatusIcon } from '@/features/vehicles/components/DeviceStatusIcon'
import type { Vehicle } from '@/types/api'

interface VehicleColumnHandlers {
  onEdit: (vehicle: Vehicle) => void
  onAssignDevice: (vehicle: Vehicle) => void
  onUnassignDevice: (vehicle: Vehicle) => void
  onDelete: (vehicle: Vehicle) => void
}

export function createVehicleColumns({
  onEdit,
  onAssignDevice,
  onUnassignDevice,
  onDelete,
}: VehicleColumnHandlers): ColumnDef<Vehicle, unknown>[] {
  return [
    {
      id: 'vehicle',
      header: 'Vehicle',
      cell: ({ row }) => {
        const vehicle = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Truck className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono font-semibold uppercase text-foreground">{vehicle.plate_number}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || '—'}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'organization',
      header: 'Organization',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.organization?.name ?? <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      id: 'driver',
      header: 'Driver',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.driver?.name ?? <span className="text-muted-foreground">Unassigned</span>}</span>
      ),
    },
    {
      id: 'device',
      header: 'Device',
      cell: ({ row }) => {
        const vehicle = row.original
        if (!vehicle.device_id) {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CircleDashed className="h-3.5 w-3.5" /> No device
            </span>
          )
        }
        return (
          <div className="flex items-center gap-1.5">
            <DeviceStatusIcon status={vehicle.device_status} />
            <span className="font-mono text-xs">{vehicle.device_id}</span>
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.created_at ? format(new Date(row.original.created_at), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const vehicle = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(vehicle)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAssignDevice(vehicle)}>
                <Cpu className="mr-2 h-4 w-4" />
                {vehicle.device_id ? 'Reassign Device' : 'Assign Device'}
              </DropdownMenuItem>
              {vehicle.device_id && (
                <DropdownMenuItem onClick={() => onUnassignDevice(vehicle)}>
                  <Link2Off className="mr-2 h-4 w-4" /> Unassign Device
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(vehicle)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
