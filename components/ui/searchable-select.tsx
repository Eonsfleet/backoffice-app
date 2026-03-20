'use client'

import * as Popover from '@radix-ui/react-popover'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options:           SelectOption[]
  value?:            string
  onValueChange:     (value: string) => void
  placeholder?:      string
  searchPlaceholder?: string
  disabled?:         boolean
  className?:        string
  /** When provided, disables client-side filtering and calls this instead (debounced 300 ms). */
  onSearch?:         (query: string) => void
  /** Shows a spinner inside the dropdown while the caller is fetching. */
  isLoading?:        boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder        = 'Select…',
  searchPlaceholder  = 'Search…',
  disabled,
  className,
  onSearch,
  isLoading,
}: SearchableSelectProps) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const inputRef          = useRef<HTMLInputElement>(null)
  const debounceRef       = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Client-side filter — only used when onSearch is NOT provided
  const filtered = useMemo(() => {
    if (onSearch) return options             // backend owns filtering
    const q = query.toLowerCase()
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  }, [options, query, onSearch])

  const selected = options.find((o) => o.value === value)

  // Reset query and focus input whenever the dropdown opens
  useEffect(() => {
    if (open) {
      setQuery('')
      if (onSearch) onSearch('')            // fetch initial list on open
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Debounce backend search
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (onSearch) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onSearch(q), 300)
    }
  }

  // Cleanup debounce on unmount
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className={cn(
            'z-50 w-[var(--radix-popover-trigger-width)] rounded-md border bg-popover text-popover-foreground shadow-md',
            'animate-in fade-in-0 zoom-in-95',
          )}
        >
          {/* Search input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={handleQueryChange}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {isLoading && (
              <Loader2 className="ml-2 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto p-1">
            {isLoading && filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Searching…</p>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No results</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onValueChange(o.value); setOpen(false) }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                    'hover:bg-accent hover:text-accent-foreground',
                    value === o.value && 'bg-accent text-accent-foreground font-medium',
                  )}
                >
                  <Check className={cn('h-3.5 w-3.5 shrink-0', value === o.value ? 'opacity-100' : 'opacity-0')} />
                  {o.label}
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
