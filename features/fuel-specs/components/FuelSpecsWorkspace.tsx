'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, Fuel, GitPullRequestArrow, Plus, Truck, UserCheck } from 'lucide-react'
import { listFuelSpecs, type FuelSpec, type FuelSpecSummary } from '../api'
import { attentionReasons, formatFigure } from '../lib'
import { SpecFormSheet } from './SpecFormSheet'
import { SpecReviewSheet } from './SpecReviewSheet'
import { UnlinkedVehicles } from './UnlinkedVehicles'
import { usePermission } from '@/hooks/usePermission'
import { useUrlListState } from '@/hooks/useUrlListState'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { FilterBar } from '@/components/shared/FilterBar'
import { KpiCard } from '@/components/shared/KpiCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Timestamp } from '@/components/shared/Timestamp'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const PAGE_SIZE = 25
const ATTENTION: { value: string; label: string }[] = [
  { value: 'all', label: 'All entries' },
  { value: 'has_proposal', label: 'Change waiting' },
  { value: 'unreviewed', label: 'No named reviewer' },
  { value: 'draft_source', label: 'Draft source' },
  { value: 'no_vehicles', label: 'Used by no vehicle' },
]

const reasonVariant = (reason: string) => (reason.startsWith('Change') ? 'info' : 'warning') as 'info' | 'warning'

export function FuelSpecsWorkspace() {
  const state = useUrlListState()
  const canManage = usePermission('admin.fuel_specs.manage')
  const tab = state.getFilter('tab', 'list') === 'unlinked' ? 'unlinked' : 'list'
  const attention = state.getFilter('attention')
  const [reviewId, setReviewId] = useState<number | null>(null)
  const [editing, setEditing] = useState<FuelSpec | 'new' | null>(null)

  const query = useQuery({
    queryKey: ['fuel-specs', { page: state.page, q: state.search, status: state.status, attention }],
    queryFn: ({ signal }) => listFuelSpecs({ page: state.page, per_page: PAGE_SIZE, search: state.search || undefined, review_status: state.status === 'all' ? undefined : state.status, attention: attention === 'all' ? undefined : attention }, signal),
    placeholderData: previous => previous,
  })
  const summary: FuelSpecSummary | undefined = query.data?.summary

  const columns: ColumnDef<FuelSpec, unknown>[] = [
    {
      id: 'entry', header: 'Entry',
      cell: ({ row }) => (
        <div className="max-w-64 whitespace-normal">
          <p className="font-medium">{row.original.label}</p>
          <p className="text-xs capitalize text-muted-foreground">{[row.original.vehicle_type, row.original.fuel_type].filter(Boolean).join(' · ') || 'Type not set'}</p>
        </div>
      ),
    },
    {
      id: 'figures', header: 'Figures',
      cell: ({ row }) => <div className="text-sm"><p>{formatFigure(row.original.tank_capacity_liters, 'L tank')}</p><p className="text-xs text-muted-foreground">{formatFigure(row.original.consumption_l_per_100km, 'L/100 km')} · {formatFigure(row.original.idle_l_per_hour, 'L/h idle')}</p></div>,
    },
    {
      id: 'status', header: 'Status',
      cell: ({ row }) => (
        <div className="flex max-w-60 flex-wrap gap-1">
          <StatusBadge status={row.original.review_status} />
          {attentionReasons(row.original).map(reason => <StatusBadge key={reason} status={reason} variant={reasonVariant(reason)} className="normal-case" />)}
        </div>
      ),
    },
    { id: 'vehicles', header: 'Vehicles', cell: ({ row }) => (row.original.linked_vehicles ?? 0).toLocaleString() },
    {
      id: 'reviewed', header: 'Reviewed',
      cell: ({ row }) => row.original.reviewed_at
        ? <div className="text-sm"><p>{row.original.reviewed_by_name ?? <span className="text-status-warning">No named reviewer</span>}</p><p className="text-xs text-muted-foreground"><Timestamp value={row.original.reviewed_at} /></p></div>
        : <span className="text-muted-foreground">—</span>,
    },
    { id: 'actions', header: 'Actions', enableHiding: false, cell: ({ row }) => <Button variant="outline" size="sm" onClick={() => setReviewId(row.original.id)}>{canManage ? 'Review' : 'View'}</Button> },
  ]

  const pagination = query.data?.pagination
  const filters = [
    ...(state.status !== 'all' ? [{ key: 'status', label: `Status: ${state.status}`, onRemove: () => state.setStatus('all') }] : []),
    ...(attention !== 'all' ? [{ key: 'attention', label: ATTENTION.find(a => a.value === attention)?.label ?? attention, onRemove: () => state.setFilter('attention', 'all') }] : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fuel reference" icon={Fuel}
        description="Typical tank capacity and consumption by make and model. Approved entries feed the fuel estimates of every vehicle linked to them."
        actions={canManage ? <Button onClick={() => setEditing('new')}><Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />Add entry</Button> : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Approved entries" value={summary ? `${summary.approved} of ${summary.total}` : undefined} icon={CheckCircle2} isLoading={query.isPending} />
        <KpiCard label="Changes waiting" value={summary?.with_proposal} icon={GitPullRequestArrow} isLoading={query.isPending} />
        <KpiCard label="No named reviewer" value={summary?.unreviewed} icon={UserCheck} isLoading={query.isPending} />
        <KpiCard label="Vehicles without an entry" value={summary?.unlinked_vehicles.toLocaleString()} icon={Truck} isLoading={query.isPending} />
      </div>

      <Tabs value={tab} onValueChange={value => state.setFilter('tab', value === 'list' ? 'all' : value)}>
        <TabsList>
          <TabsTrigger value="list">Reference list</TabsTrigger>
          <TabsTrigger value="unlinked">Vehicles without an entry{summary ? ` (${summary.unlinked_vehicles.toLocaleString()})` : ''}</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <DataTable
            caption="Fuel reference entries" data={query.data?.specs ?? []} columns={columns} isLoading={query.isPending} isFetching={query.isFetching && !query.isPending}
            error={query.error} onRetry={() => void query.refetch()}
            pagination={{ pageIndex: state.page - 1, pageSize: PAGE_SIZE }} pageCount={pagination?.last_page ?? 1} onPaginationChange={next => state.setPage(next.pageIndex + 1)}
            toolbar={
              <FilterBar search={state.search} onSearchChange={state.setSearch} searchLabel="Search entries" placeholder="Make, model or variant" filters={filters} onReset={() => { state.reset(); state.setFilter('attention', 'all') }}>
                <div>
                  <label id="fuel-spec-status-label" className="mb-1.5 block text-xs font-medium">Status</label>
                  <Select value={state.status} onValueChange={state.setStatus}>
                    <SelectTrigger aria-labelledby="fuel-spec-status-label" className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <label id="fuel-spec-attention-label" className="mb-1.5 block text-xs font-medium">Needs attention</label>
                  <Select value={attention} onValueChange={value => state.setFilter('attention', value)}>
                    <SelectTrigger aria-labelledby="fuel-spec-attention-label" className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>{ATTENTION.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </FilterBar>
            }
          />
        </TabsContent>
        <TabsContent value="unlinked" className="mt-4"><UnlinkedVehicles canManage={canManage} /></TabsContent>
      </Tabs>

      {reviewId !== null && !editing && <SpecReviewSheet key={reviewId} id={reviewId} canManage={canManage} onClose={() => setReviewId(null)} onEdit={() => void query.data && setEditing(query.data.specs.find(s => s.id === reviewId) ?? null)} />}
      {editing && <SpecFormSheet key={editing === 'new' ? 'new' : editing.id} spec={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      <p className="text-xs text-muted-foreground">Editing an approved entry never stops its estimates: the change waits beside the approved figures until a super-admin approves it. Rates reach the platform with the next hourly sync.</p>
    </div>
  )
}
