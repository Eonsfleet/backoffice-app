'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Wrench } from 'lucide-react'
import { listInstallers, type Installer } from '../api'
import { useUrlListState } from '@/hooks/useUrlListState'
import { useDebounce } from '@/hooks/useDebounce'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { FilterBar } from '@/components/shared/FilterBar'
import { CopyValue } from '@/components/shared/CopyValue'
import { StatusBadge } from '@/components/shared/StatusBadge'

const columns: ColumnDef<Installer, unknown>[] = [
  { id: 'name', accessorFn: row => row.attributes.name, header: 'Installer', cell: ({ row }) => <div className="max-w-72"><p className="whitespace-normal break-words font-medium">{row.original.attributes.name || 'Name unavailable'}</p><CopyValue value={row.original.id} label="Installer ID" /></div> },
  { id: 'email', header: 'Contact', cell: ({ row }) => <div className="max-w-72 whitespace-normal break-all"><p>{row.original.attributes.email || 'Email unavailable'}</p><p className="text-xs text-muted-foreground">{row.original.attributes.phone || 'Phone unavailable'}</p></div> },
  { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.attributes.status} /> },
  { id: 'organizations', header: 'Assigned organizations', cell: ({ row }) => <div className="flex max-w-96 flex-wrap gap-2">{row.original.relationships?.organizations === undefined ? <span className="text-muted-foreground">Unavailable</span> : row.original.relationships.organizations.length === 0 ? <span className="text-muted-foreground">None assigned</span> : row.original.relationships.organizations.map(org => <Link key={org.id} href={`/organizations/${org.id}`} className="whitespace-normal break-words rounded border px-2 py-1 text-xs text-primary hover:bg-muted">{org.name}</Link>)}</div> },
]
export function InstallersWorkspace() {
  const state = useUrlListState()
  const search = useDebounce(state.search)
  const query = useQuery({ queryKey: ['installers', search, state.page], queryFn: ({ signal }) => listInstallers({ q: search || undefined, page: state.page, perPage: 20 }, signal), staleTime: 30_000 })
  return <div className="space-y-6"><PageHeader title="Installers" icon={Wrench} description="Installer directory and assigned customer organizations." /><DataTable caption="Installers and assigned organizations" data={query.data?.installers ?? []} columns={columns} isLoading={query.isPending} isFetching={query.isFetching} error={query.error} onRetry={() => void query.refetch()} pagination={{ pageIndex: state.page - 1, pageSize: 20 }} pageCount={query.data?.pagination.lastPage ?? 1} onPaginationChange={next => state.setPage(next.pageIndex + 1)} toolbar={<FilterBar search={state.search} onSearchChange={state.setSearch} searchLabel="Search installer names" placeholder="Installer name" onReset={state.reset} />} /><p className="text-xs text-muted-foreground">Assignments shown here are organization access relationships. Installation job schedules and completion evidence require a separate job contract.</p></div>
}
