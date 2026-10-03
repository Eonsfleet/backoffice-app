'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Users } from 'lucide-react'
import { listDrivers, type DriverProfile } from '../api'
import { useUrlListState } from '@/hooks/useUrlListState'
import { useDebounce } from '@/hooks/useDebounce'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { FilterBar } from '@/components/shared/FilterBar'
import { CopyValue } from '@/components/shared/CopyValue'
import { Timestamp } from '@/components/shared/Timestamp'
import { StatusBadge } from '@/components/shared/StatusBadge'

const columns: ColumnDef<DriverProfile, unknown>[] = [
  { accessorKey: 'name', header: 'Driver', cell: ({ row }) => <div className="max-w-64 whitespace-normal"><p className="break-words font-medium">{row.original.name || 'Name unavailable'}</p><CopyValue value={row.original.id} label="Driver ID" /></div> },
  { accessorKey: 'email', header: 'Contact', cell: ({ row }) => <div className="max-w-72 whitespace-normal break-all"><p>{row.original.email || 'Email unavailable'}</p><p className="text-xs text-muted-foreground">{row.original.phone || 'Phone unavailable'}</p></div> },
  { id: 'organization', header: 'Organization', cell: ({ row }) => row.original.organization ? <Link href={`/organizations/${row.original.organization.id}`} className="block max-w-64 whitespace-normal break-words text-primary">{row.original.organization.name}</Link> : 'Unavailable' },
  { id: 'vehicle', header: 'Current vehicle', cell: ({ row }) => row.original.vehicle ? <Link href={`/vehicles/${row.original.vehicle.id}`} className="text-primary">{row.original.vehicle.plate_number || row.original.vehicle.id}</Link> : <span className="text-muted-foreground">No current vehicle</span> },
  { id: 'cluster', header: 'Cluster', cell: ({ row }) => row.original.cluster?.name || 'No cluster returned' },
  { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { id: 'last_login', header: 'Last login', cell: ({ row }) => <Timestamp value={row.original.last_login} /> },
]
export function DriversWorkspace() {
  const state = useUrlListState()
  const search = useDebounce(state.search)
  const query = useQuery({ queryKey: ['drivers', search, state.page], queryFn: ({ signal }) => listDrivers({ q: search || undefined, page: state.page, per_page: 20 }, signal), staleTime: 30_000 })
  return <div className="space-y-6"><PageHeader title="Drivers" icon={Users} description="Customer drivers, their organizations and current vehicle assignments." /><DataTable caption="Customer driver directory" data={query.data?.data ?? []} columns={columns} isLoading={query.isPending} isFetching={query.isFetching} error={query.error} onRetry={() => void query.refetch()} pagination={{ pageIndex: state.page - 1, pageSize: 20 }} pageCount={query.data?.meta.last_page ?? 1} onPaginationChange={next => state.setPage(next.pageIndex + 1)} toolbar={<FilterBar search={state.search} onSearchChange={state.setSearch} searchLabel="Search drivers" placeholder="Name or email" onReset={state.reset} />} /></div>
}
