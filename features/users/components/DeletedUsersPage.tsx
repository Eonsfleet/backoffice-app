'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { BulkRecordsTable } from '@/components/shared/BulkRecordsTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { Timestamp } from '@/components/shared/Timestamp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/useDebounce'
import { useUrlListState } from '@/hooks/useUrlListState'
import { listDeletedUsers, permanentlyDeleteUsers, restoreDeletedUsers } from '@/features/users/api'
import type { TenantUser } from '@/types/api'

const columns: ColumnDef<TenantUser, unknown>[] = [
  { accessorKey: 'name', header: 'User', cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-muted-foreground">{row.original.email}</p></div> },
  { id: 'organization', header: 'Organization', cell: ({ row }) => row.original.organization?.name ?? 'Unavailable' },
  { accessorKey: 'role', header: 'Previous role', cell: ({ row }) => row.original.role ?? 'Not assigned' },
  { accessorKey: 'deleted_at', header: 'Deleted', cell: ({ row }) => <Timestamp value={row.original.deleted_at} /> },
]

export default function DeletedUsersPage() {
  const { search, page, setSearch, setPage } = useUrlListState()
  const q = useDebounce(search, 300)
  const query = useQuery({ queryKey: ['deleted-users', { q, page }], queryFn: () => listDeletedUsers({ q: q || undefined, page, per_page: 15 }), staleTime: 30_000 })
  return <div className="space-y-6">
    <PageHeader title="Deleted users" description="Review soft-deleted customer users, restore their accounts, or permanently remove them." icon={Trash2} actions={<Button variant="outline" asChild><Link href="/users"><ArrowLeft className="mr-2 h-4 w-4" />Customer users</Link></Button>} />
    <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Deleted users are excluded from user summary counts. Restoring retains the account’s previous status and any roles still assigned. Permanent deletion cannot be undone.</p>
    <BulkRecordsTable data={query.data?.data ?? []} columns={columns} selectionScope={JSON.stringify({ q, page })} invalidateKeys={['users', 'deleted-users', 'user-metrics', 'drivers']} actions={[
      { label: 'Restore selected users', description: 'Restore the selected accounts with their previous statuses and retained roles. Previously revoked sessions remain revoked.', run: restoreDeletedUsers, variant: 'default' },
      { label: 'Permanently delete selected users', description: 'Permanently remove the selected deleted accounts. This cannot be undone. If a record conflicts with existing data, the entire request will fail.', run: permanentlyDeleteUsers },
    ]} isLoading={query.isLoading} isFetching={query.isFetching} error={query.error} onRetry={() => void query.refetch()} emptyMessage="No deleted users match your search." caption="Deleted customer users" toolbar={<Input aria-label="Search deleted users" placeholder="Search deleted users by name or email..." value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} className="max-w-md" />} pagination={{ pageIndex: page - 1, pageSize: 15 }} pageCount={query.data?.meta.last_page ?? 1} onPaginationChange={state => setPage(state.pageIndex + 1)} />
  </div>
}
