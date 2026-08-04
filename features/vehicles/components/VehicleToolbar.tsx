import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { VEHICLE_STATUS_OPTIONS } from '@/features/vehicles/constants'
import type { Organization } from '@/types/api'

interface VehicleToolbarProps {
  search: string
  status: string
  orgFilter: string
  organizations?: Organization[]
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onOrgChange: (value: string) => void
}

export function VehicleToolbar({
  search,
  status,
  orgFilter,
  organizations = [],
  onSearchChange,
  onStatusChange,
  onOrgChange,
}: VehicleToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-full flex-1 sm:min-w-[200px] sm:max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search plate, make, model…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-8"
        />
      </div>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {VEHICLE_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={orgFilter} onValueChange={onOrgChange}>
        <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All Organizations" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Organizations</SelectItem>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={String(org.identifier ?? org.id)}>{org.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
