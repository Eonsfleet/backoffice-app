'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiErrorMessage, linkFuelSpec, listFuelSpecs, listUnlinkedVehicles, type UnlinkedGroup } from '../api'
import { formatFigure } from '../lib'
import { useDebounce } from '@/hooks/useDebounce'
import { DataTable } from '@/components/shared/DataTable'
import { FilterBar } from '@/components/shared/FilterBar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const years = (g: UnlinkedGroup) => (g.year_from ? (g.year_from === g.year_to || !g.year_to ? String(g.year_from) : `${g.year_from}–${g.year_to}`) : '—')

/** Link every unlinked vehicle of one make and model to an approved entry: a person's decision. */
function LinkSheet({ group, onClose }: { group: UnlinkedGroup; onClose: () => void }) {
  const qc = useQueryClient()
  const [term, setTerm] = useState(`${group.make} ${group.model}`.trim())
  const debounced = useDebounce(term, 300)
  const [specId, setSpecId] = useState('')
  const [respectYears, setRespectYears] = useState(true)
  const specs = useQuery({ queryKey: ['fuel-specs', { link: debounced }], queryFn: ({ signal }) => listFuelSpecs({ review_status: 'approved', search: debounced, per_page: 30 }, signal) })
  const options = (specs.data?.specs ?? []).map(spec => ({
    value: String(spec.id),
    label: `${spec.label} · ${formatFigure(spec.consumption_l_per_100km, 'L/100 km')} · ${formatFigure(spec.tank_capacity_liters, 'L')}`,
  }))
  const link = useMutation({
    mutationFn: () => linkFuelSpec(Number(specId), { make: group.make, model: group.model, respect_years: respectYears }),
    onSuccess: result => {
      void qc.invalidateQueries({ queryKey: ['fuel-specs'] })
      void qc.invalidateQueries({ queryKey: ['fuel-specs-unlinked'] })
      void qc.invalidateQueries({ queryKey: ['fuel-spec'] })
      toast.success(`Linked ${result.linked.toLocaleString()} vehicles${result.skipped_outside_years > 0 ? `; ${result.skipped_outside_years.toLocaleString()} left out for their year` : ''}. Rates reach the platform with the next hourly sync.`)
      onClose()
    },
  })
  return (
    <Sheet open onOpenChange={open => { if (!open && !link.isPending) onClose() }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Link {group.make} {group.model}</SheetTitle>
          <SheetDescription>{group.vehicles.toLocaleString()} vehicles ({group.with_device.toLocaleString()} with a tracker) have no fuel reference entry. Choose the approved entry they should use.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-6">
          <div>
            <p id="link-entry-label" className="mb-1.5 text-sm font-medium">Approved entry</p>
            <SearchableSelect options={options} value={specId} onValueChange={setSpecId} placeholder="Choose an entry" searchPlaceholder="Search make or model" onSearch={setTerm} isLoading={specs.isFetching} />
            {specs.isSuccess && options.length === 0 && <p className="mt-1 text-xs text-muted-foreground">No approved entry matches. Add one, or approve a pending one, first.</p>}
          </div>
          <div className="flex items-start gap-3">
            <Switch id="link-respect-years" checked={respectYears} onCheckedChange={setRespectYears} />
            <label htmlFor="link-respect-years" className="text-sm"><span className="font-medium">Skip vehicles outside the entry’s years</span><span className="block text-xs text-muted-foreground">Vehicles with no year are always linked.</span></label>
          </div>
          {link.isError && <p role="alert" className="rounded-md border border-status-error/30 bg-status-error-surface p-3 text-sm text-status-error">{apiErrorMessage(link.error)}</p>}
          <div className="flex gap-2">
            <Button onClick={() => link.mutate()} disabled={!specId || link.isPending}>{link.isPending ? 'Linking…' : 'Link vehicles'}</Button>
            <Button variant="outline" onClick={onClose} disabled={link.isPending}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function UnlinkedVehicles({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 300)
  const [linking, setLinking] = useState<UnlinkedGroup | null>(null)
  const query = useQuery({ queryKey: ['fuel-specs-unlinked', debounced], queryFn: ({ signal }) => listUnlinkedVehicles(debounced, signal), staleTime: 30_000 })
  const columns: ColumnDef<UnlinkedGroup, unknown>[] = [
    { id: 'vehicle', header: 'Make and model', cell: ({ row }) => <span className="font-medium capitalize">{row.original.make || 'Unknown make'} {row.original.model}</span> },
    { accessorKey: 'vehicles', header: 'Vehicles', cell: ({ row }) => row.original.vehicles.toLocaleString() },
    { accessorKey: 'with_device', header: 'With a tracker', cell: ({ row }) => row.original.with_device.toLocaleString() },
    { accessorKey: 'organizations', header: 'Organizations', cell: ({ row }) => row.original.organizations.toLocaleString() },
    { id: 'years', header: 'Years', cell: ({ row }) => years(row.original) },
    {
      id: 'actions', header: 'Actions', enableHiding: false,
      cell: ({ row }) => canManage && row.original.make && row.original.model
        ? <Button variant="outline" size="sm" onClick={() => setLinking(row.original)}><Link2 aria-hidden="true" className="mr-1 h-3 w-3" />Link to entry</Button>
        : null,
    },
  ]
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Vehicles with no reference entry get no fuel estimate from the platform. The automatic matcher links only what is unambiguous; these are the groups left, largest first.</p>
      <DataTable
        caption="Vehicles without a fuel reference entry" data={query.data?.groups ?? []} columns={columns} isLoading={query.isPending} error={query.error} onRetry={() => void query.refetch()}
        emptyMessage={debounced ? 'No unlinked vehicle matches this search.' : 'Every vehicle is linked to a fuel reference entry.'}
        toolbar={<FilterBar search={search} onSearchChange={setSearch} searchLabel="Search unlinked vehicles" placeholder="Make or model" onReset={() => setSearch('')} />}
      />
      {linking && <LinkSheet key={`${linking.make}/${linking.model}`} group={linking} onClose={() => setLinking(null)} />}
    </div>
  )
}
