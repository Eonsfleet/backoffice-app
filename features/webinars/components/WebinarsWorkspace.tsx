'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Building2, Copy, Download, Globe2, Phone, Users, Video } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { FilterBar } from '@/components/shared/FilterBar'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Timestamp } from '@/components/shared/Timestamp'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/useDebounce'
import { useUrlListState } from '@/hooks/useUrlListState'
import { listWebinarRegistrations, type WebinarRegistrant } from '@/features/webinars/api'
import { filterRegistrants, registrantsToCsv, uniqueValues } from '@/features/webinars/lib'

const PAGE_SIZE = 15
const none = <span className="text-muted-foreground">Unavailable</span>

const columns: ColumnDef<WebinarRegistrant, unknown>[] = [
  { id: 'name', header: 'Registrant', cell: ({ row }) => <div><p className="font-medium">{row.original.name ?? 'Unnamed'}</p><p className="text-xs text-muted-foreground">{row.original.email ?? 'No email'}</p>{row.original.secondary_email && <p className="text-xs text-muted-foreground">{row.original.secondary_email}</p>}</div> },
  { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => row.original.phone ?? none },
  { id: 'company', header: 'Company', cell: ({ row }) => <div><p>{row.original.company ?? none}</p><p className="text-xs text-muted-foreground">{row.original.job_title}</p></div> },
  { accessorKey: 'country', header: 'Country', cell: ({ row }) => row.original.country ?? none },
  { accessorKey: 'industry', header: 'Industry', cell: ({ row }) => row.original.industry ?? none },
  { accessorKey: 'fleet_size', header: 'Fleet size', cell: ({ row }) => row.original.fleet_size ?? none },
  { accessorKey: 'role', header: 'Role', cell: ({ row }) => row.original.role ?? none },
  { accessorKey: 'registered_at', header: 'Registered', cell: ({ row }) => <Timestamp value={row.original.registered_at} /> },
]

export default function WebinarsWorkspace() {
  const { search, page, getFilter, setFilter, setSearch, setPage, reset } = useUrlListState()
  const q = useDebounce(search, 300)
  const country = getFilter('country')
  const query = useQuery({ queryKey: ['webinar-registrations'], queryFn: listWebinarRegistrations, staleTime: 30_000 })

  const users = useMemo(() => query.data?.users ?? [], [query.data])
  const countries = useMemo(() => uniqueValues(users, 'country'), [users])
  const filtered = useMemo(() => filterRegistrants(users, q, country), [users, q, country])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageIndex = Math.min(page, pageCount) - 1
  const rows = filtered.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)
  const phones = query.data?.phone_numbers ?? []

  async function copyPhones() {
    try { await navigator.clipboard.writeText(phones.join('\n')); toast.success(`${phones.length} phone numbers copied`) }
    catch { toast.error('Could not copy. Export the CSV instead.') }
  }

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([registrantsToCsv(filtered)], { type: 'text/csv;charset=utf-8' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `webinar-registrations-${new Date().toISOString().slice(0, 10)}.csv` })
    link.click()
    URL.revokeObjectURL(url)
  }

  return <div className="space-y-6">
    <PageHeader title="Webinars" description="People who registered for Eonsfleet webinars." icon={Video} actions={<>
      <Button variant="outline" onClick={() => void copyPhones()} disabled={!phones.length}><Copy className="mr-2 h-4 w-4" />Copy phone numbers</Button>
      <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
    </>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Registrations" value={query.data?.total} icon={Users} isLoading={query.isLoading} />
      <KpiCard label="Phone numbers" value={phones.length} icon={Phone} isLoading={query.isLoading} />
      <KpiCard label="Countries" value={countries.length} icon={Globe2} isLoading={query.isLoading} />
      <KpiCard label="Companies" value={uniqueValues(users, 'company').length} icon={Building2} isLoading={query.isLoading} />
    </div>
    <DataTable data={rows} columns={columns} isLoading={query.isLoading} isFetching={query.isFetching} error={query.error} onRetry={() => void query.refetch()}
      emptyMessage="No registrations match your search." caption="Webinar registrations"
      pagination={{ pageIndex, pageSize: PAGE_SIZE }} pageCount={pageCount} onPaginationChange={state => setPage(state.pageIndex + 1)}
      toolbar={<FilterBar search={search} onSearchChange={setSearch} searchLabel="Search registrations" placeholder="Name, email, phone, company…" onReset={reset}
        filters={country !== 'all' ? [{ key: 'country', label: `Country: ${country}`, onRemove: () => setFilter('country', 'all') }] : []}>
        <div><label htmlFor="webinar-country" className="mb-1.5 block text-xs font-medium">Country</label>
          <select id="webinar-country" value={country} onChange={event => setFilter('country', event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-48">
            <option value="all">All countries</option>{countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select></div>
      </FilterBar>} />
  </div>
}
