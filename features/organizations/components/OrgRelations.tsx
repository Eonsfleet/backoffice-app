'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { listDevices } from '@/features/devices/api'
import { listVehicles } from '@/features/vehicles/api'
import { listUsers } from '@/features/users/api'
import { useDebounce } from '@/hooks/useDebounce'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Input } from '@/components/ui/input'

type EntityRow = { id: string | number; name: string; detail: string; status: string; href?: string }

export function OrgRelations({ organizationId, kind }: { organizationId: string | number; kind: 'users' | 'vehicles' | 'devices' }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const term = useDebounce(search, 300)
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['organization-relations', organizationId, kind, page, term],
    queryFn: async () => {
      const params = { organization_id: organizationId, page, per_page: 15, q: term || undefined }
      if (kind === 'devices') {
        const result = await listDevices(params)
        return { ...result, data: result.data.map(d => ({ id: d.id, name: d.device_id, detail: d.vehicle?.plate_number ?? 'No assigned vehicle', status: d.status, href: `/devices/${d.id}` })) }
      }
      if (kind === 'vehicles') {
        const result = await listVehicles(params)
        return { ...result, data: result.data.map(v => ({ id: v.id, name: v.plate_number, detail: [v.make, v.model].filter(Boolean).join(' '), status: v.status, href: `/vehicles?q=${encodeURIComponent(v.plate_number)}` })) }
      }
      const result = await listUsers(params)
      return { ...result, data: result.data.map(u => ({ id: u.id, name: u.name, detail: u.email, status: u.status, href: `/users?q=${encodeURIComponent(u.email)}` })) }
    },
    staleTime: 30000,
  })
  const columns: ColumnDef<EntityRow, unknown>[] = [
    { accessorKey: 'name', header: kind === 'devices' ? 'IMEI / identifier' : kind === 'vehicles' ? 'Registration' : 'Name', cell: ({ row }) => <div><Link href={row.original.href ?? '#'} className="font-medium text-primary hover:underline">{row.original.name}</Link><p className="mt-1 text-xs text-muted-foreground">{row.original.detail}</p></div> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: 'id', header: 'Record ID' },
  ]
  return <DataTable<EntityRow> data={data?.data ?? []} columns={columns} error={error} onRetry={() => void refetch()} isLoading={isLoading} isFetching={isFetching} emptyMessage={`No ${kind} match this organization's current filters.`} toolbar={<div className="flex flex-wrap items-center gap-3"><Input aria-label={`Search organization ${kind}`} placeholder={`Search ${kind}...`} className="max-w-sm" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} /><span className="text-xs text-muted-foreground">{data?.meta.total ?? '—'} {kind}</span></div>} pagination={{ pageIndex: page - 1, pageSize: 15 }} pageCount={data?.meta.last_page ?? 1} onPaginationChange={value => setPage(value.pageIndex + 1)} />
}
