'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { HeartPulse } from 'lucide-react'
import { listOrganizations } from '@/features/organizations/api'
import { accountSignals } from '@/features/organizations/health'
import type { Organization } from '@/types/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/useDebounce'

export function CustomerHealth() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const term = useDebounce(search, 300)
  const { data, isLoading, isFetching, error, refetch } = useQuery({ queryKey: ['customer-health', term, status, page], queryFn: () => listOrganizations({ q: term || undefined, status: status === 'all' ? undefined : status, page, per_page: 15 }), staleTime: 30000 })
  const columns: ColumnDef<Organization, unknown>[] = [
    { accessorKey: 'name', header: 'Organization', cell: ({ row }) => <Link className="font-medium text-primary hover:underline" href={`/organizations/${row.original.id}`}>{row.original.name}</Link> },
    { accessorKey: 'status', header: 'Account status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'plan', header: 'Plan', cell: ({ row }) => row.original.current_plan?.plan.name ?? row.original.subscription_plan ?? 'Unavailable' },
    { id: 'signals', header: 'Observed signals', cell: ({ row }) => { const signals = accountSignals(row.original); return <div className="max-w-sm text-xs leading-5">{signals.length ? signals.map(s => <p key={s} className="text-amber-700 dark:text-amber-400">{s}</p>) : <span className="text-muted-foreground">No concerns in the available account data</span>}</div> } },
  ]
  return <div className="space-y-6"><PageHeader title="Customer health" description="Understand account and subscription signals before opening an organization." icon={HeartPulse} /><div className="rounded-lg border bg-card p-4 text-sm leading-6 text-muted-foreground">Signals use account status, subscription status and asset usage. Usage is flagged at 90% of the plan limit. Device offline rates, payment failures and recent activity are not available in this account feed.</div><DataTable data={data?.data ?? []} columns={columns} isLoading={isLoading} isFetching={isFetching} error={error} onRetry={() => void refetch()} toolbar={<div className="flex flex-wrap gap-3"><Input aria-label="Search customer accounts" placeholder="Search organizations..." value={search} className="max-w-sm" onChange={e => { setSearch(e.target.value); setPage(1) }} /><select aria-label="Filter account status" className="rounded-md border bg-card px-3 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>{['all', 'active', 'inactive', 'suspended', 'expired'].map(s => <option value={s} key={s}>{s === 'all' ? 'All account statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></div>} pagination={{ pageIndex: page - 1, pageSize: 15 }} pageCount={data?.meta.last_page ?? 1} onPaginationChange={p => setPage(p.pageIndex + 1)} /></div>
}
