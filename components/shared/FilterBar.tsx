'use client'

import { useId } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function FilterBar({ search, onSearchChange, searchLabel, placeholder, children, actions, filters = [], onReset }: {
  search: string; onSearchChange: (value: string) => void; searchLabel: string; placeholder?: string
  children?: React.ReactNode; actions?: React.ReactNode
  filters?: { key: string; label: string; onRemove: () => void }[]; onReset?: () => void
}) {
  const id = useId()
  return <div className="space-y-3">
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-72"><label htmlFor={id} className="mb-1.5 block text-xs font-medium">{searchLabel}</label><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id={id} value={search} onChange={event => onSearchChange(event.target.value)} placeholder={placeholder} className="pl-9" /></div></div>
      {children}<div className="flex flex-wrap items-center gap-2 sm:ml-auto">{actions}</div>
    </div>
    {(search || filters.length > 0) && <div aria-label="Active filters" className="flex flex-wrap items-center gap-2">
      {search && <Button variant="secondary" size="sm" onClick={() => onSearchChange('')} aria-label="Remove search filter">Search: <span className="max-w-56 truncate">{search}</span><X aria-hidden="true" className="ml-2 h-3 w-3" /></Button>}
      {filters.map(filter => <Button key={filter.key} variant="secondary" size="sm" onClick={filter.onRemove} aria-label={`Remove ${filter.label} filter`}>{filter.label}<X aria-hidden="true" className="ml-2 h-3 w-3" /></Button>)}
      {onReset && <Button variant="ghost" size="sm" onClick={onReset}>Reset filters</Button>}
    </div>}
  </div>
}
