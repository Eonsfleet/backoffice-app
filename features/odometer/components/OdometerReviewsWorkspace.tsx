'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { SlideOver } from '@/components/shared/SlideOver'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Timestamp } from '@/components/shared/Timestamp'
import { Button } from '@/components/ui/button'
import { useUrlListState } from '@/hooks/useUrlListState'
import { useAuthStore } from '@/stores/auth.store'
import { listOdometerReviews, type OdometerReview, type ReviewStatusFilter } from '@/features/odometer/api'
import { approvalProgress, canReviewOdometer, formatKm, reasonLabel } from '@/features/odometer/lib'
import { ReviewDetail } from './ReviewDetail'

const FILTERS: { value: ReviewStatusFilter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export function OdometerReviewsWorkspace() {
  const state = useUrlListState()
  const user = useAuthStore(s => s.user)
  const status = (FILTERS.find(f => f.value === state.status)?.value ?? 'pending') as ReviewStatusFilter
  const [selected, setSelected] = useState<OdometerReview | null>(null)
  const query = useQuery({
    queryKey: ['odometer-reviews', status, state.page],
    queryFn: ({ signal }) => listOdometerReviews({ status, page: state.page }, signal),
    staleTime: 30_000,
  })

  const columns: ColumnDef<OdometerReview, unknown>[] = [
    { id: 'vehicle', header: 'Vehicle', cell: ({ row }) => <span className="font-mono text-sm font-semibold uppercase">{row.original.vehicle?.registration_number ?? 'Unavailable'}</span> },
    { id: 'reason', header: 'Reason', cell: ({ row }) => <div><p>{reasonLabel(row.original.reason)}</p><p className="text-xs capitalize text-muted-foreground">{row.original.level} level</p></div> },
    { id: 'reading', header: 'Previous → submitted', cell: ({ row }) => <span className="tabular-nums">{formatKm(row.original.previous_accepted_km)} → {formatKm(row.original.proposed_km)}</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <div className="space-y-1"><StatusBadge status={row.original.overdue && row.original.status === 'pending' ? 'overdue' : row.original.status} />{approvalProgress(row.original) && <p className="text-xs text-muted-foreground">{approvalProgress(row.original)!.split('.')[0]}</p>}</div> },
    { id: 'responsible', header: 'Responsible', cell: ({ row }) => row.original.responsible?.name ?? <span className="text-muted-foreground">Unassigned</span> },
    { id: 'created', header: 'Opened', cell: ({ row }) => <Timestamp value={row.original.created_at} /> },
    { id: 'open', header: () => <span className="sr-only">Open</span>, cell: ({ row }) => <Button variant="outline" size="sm" onClick={() => setSelected(row.original)} aria-label={`Open review ${row.original.id}`}>Open</Button> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Odometer reviews" icon={ClipboardCheck} description="Dashboard readings flagged for support review." />
      {!canReviewOdometer(user) && (
        <p role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">You can look at reviews, but deciding them needs the odometer reviewer permission.</p>
      )}
      <div role="group" aria-label="Review status" className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <Button key={f.value} size="sm" variant={status === f.value ? 'default' : 'outline'} aria-pressed={status === f.value} onClick={() => state.setStatus(f.value)}>{f.label}</Button>
        ))}
      </div>
      <DataTable
        caption="Odometer reviews"
        data={query.data?.reviews ?? []}
        columns={columns}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyMessage={`No ${status} reviews.`}
        pagination={{ pageIndex: state.page - 1, pageSize: query.data?.pagination.perPage ?? 20 }}
        pageCount={query.data?.pagination.lastPage ?? 1}
        onPaginationChange={next => state.setPage(next.pageIndex + 1)}
      />
      <SlideOver
        open={!!selected}
        onOpenChange={open => { if (!open) setSelected(null) }}
        title={selected ? `Review ${selected.id}` : 'Review'}
        description={selected?.vehicle?.registration_number ?? undefined}
        width="lg"
      >
        {selected && <ReviewDetail key={String(selected.id)} reviewId={selected.id} initial={selected} />}
      </SlideOver>
    </div>
  )
}
