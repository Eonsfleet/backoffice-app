'use client'

import { useState } from 'react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface DateRange {
  from: Date
  to: Date
}

interface DateRangePickerProps {
  value?: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

const PRESETS = [
  { label: 'Today',    getDates: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Last 7 days',  getDates: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: 'Last 30 days', getDates: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: 'Last 90 days', getDates: () => ({ from: startOfDay(subDays(new Date(), 89)), to: endOfDay(new Date()) }) },
]

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const label = value
    ? `${format(value.from, 'MMM d, yyyy')} – ${format(value.to, 'MMM d, yyyy')}`
    : 'Pick a date range'

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn('justify-start gap-2 text-left font-normal', !value && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.label}
            onSelect={() => { onChange(preset.getDates()); setOpen(false) }}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            // Fallback: last 12 months
            onChange({ from: startOfDay(subDays(new Date(), 364)), to: endOfDay(new Date()) })
            setOpen(false)
          }}
        >
          Last 12 months
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
