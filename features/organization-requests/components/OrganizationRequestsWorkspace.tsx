'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  CheckCircle2, ClipboardList, Eye, MessageSquareText, Search, XCircle,
} from 'lucide-react'

import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  listOrganizationRequests,
  reviewOrganizationRequest,
  type OrganizationRequest,
} from '@/features/organization-requests/api'

const PER_PAGE = 20

const STATUS_OPTIONS = [
  { value: 'all',       label: 'All Statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved',  label: 'Approved' },
  { value: 'rejected',  label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
]

function typeLabel(value?: string | null) {
  return value ? value.replace(/_/g, ' ') : 'Request'
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, 'MMM d, yyyy HH:mm')
}

function RequestDetail({
  request,
  note,
  onNoteChange,
  isPending,
  onReview,
}: {
  request: OrganizationRequest
  note: string
  onNoteChange: (value: string) => void
  isPending: boolean
  onReview: (status: 'in_review' | 'approved' | 'rejected') => void
}) {
  const isClosed = ['approved', 'rejected', 'cancelled'].includes(request.status)

  return (
    <div className="space-y-5 text-sm">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={request.status} />
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
            {typeLabel(request.type)}
          </span>
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">{request.subject}</p>
          {request.details && <p className="mt-2 whitespace-pre-wrap leading-6 text-muted-foreground">{request.details}</p>}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2">
        <Info label="Organization" value={request.organization?.name ?? '—'} />
        <Info label="Identifier" value={request.organization?.identifier ?? '—'} />
        <Info label="Requested By" value={request.requested_by?.name ?? '—'} />
        <Info label="Requested At" value={formatDate(request.created_at)} />
        <Info label="Reviewed By" value={request.reviewed_by?.name ?? '—'} />
        <Info label="Reviewed At" value={formatDate(request.reviewed_at)} />
      </div>

      {request.metadata && Object.keys(request.metadata).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Metadata</p>
          <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs">
            {JSON.stringify(request.metadata, null, 2)}
          </pre>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="review-note">Review note</Label>
        <textarea
          id="review-note"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Add context for the organization or internal audit trail..."
          className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {request.review_note && (
          <p className="text-xs text-muted-foreground">
            Current note: {request.review_note}
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button variant="outline" disabled={isPending || request.status === 'in_review'} onClick={() => onReview('in_review')}>
          <MessageSquareText className="mr-2 h-4 w-4" /> In Review
        </Button>
        <Button disabled={isPending || isClosed} onClick={() => onReview('approved')}>
          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
        </Button>
        <Button variant="destructive" disabled={isPending || isClosed} onClick={() => onReview('rejected')}>
          <XCircle className="mr-2 h-4 w-4" /> Reject
        </Button>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words font-medium text-foreground">{value}</p>
    </div>
  )
}

export default function OrganizationRequestsWorkspace() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('pending')
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<OrganizationRequest | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const filters = {
    page,
    per_page: PER_PAGE,
    status: status !== 'all' ? status : undefined,
    type: type !== 'all' ? type : undefined,
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['organization-requests', filters],
    queryFn: () => listOrganizationRequests(filters),
    staleTime: 30_000,
  })

  const reviewMutation = useMutation({
    mutationFn: (payload: { id: string | number; status: 'in_review' | 'approved' | 'rejected'; review_note?: string }) =>
      reviewOrganizationRequest(payload.id, { status: payload.status, review_note: payload.review_note || undefined }),
    onSuccess: (request) => {
      qc.invalidateQueries({ queryKey: ['organization-requests'] })
      toast.success('Request updated')
      setSelected(request)
      setReviewNote(request.review_note ?? '')
    },
    onError: () => toast.error('Failed to update request'),
  })

  const requests = useMemo(() => {
    const items = data?.data ?? []
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter((request) => [
      request.subject,
      request.details,
      request.type,
      request.organization?.name,
      request.organization?.identifier,
      request.requested_by?.name,
      request.requested_by?.email,
    ].some((value) => String(value ?? '').toLowerCase().includes(q)))
  }, [data?.data, search])

  const openRequest = (request: OrganizationRequest) => {
    setSelected(request)
    setReviewNote(request.review_note ?? '')
  }

  const columns: ColumnDef<OrganizationRequest, unknown>[] = [
    {
      id: 'request',
      header: 'Request',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.original.subject}</p>
          <p className="truncate text-xs capitalize text-muted-foreground">{typeLabel(row.original.type)}</p>
        </div>
      ),
    },
    {
      id: 'organization',
      header: 'Organization',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.original.organization?.name ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.organization?.identifier ?? ''}</p>
        </div>
      ),
    },
    {
      id: 'requested_by',
      header: 'Requested By',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.original.requested_by?.name ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.requested_by?.email ?? ''}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.created_at
            ? formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })
            : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRequest(row.original)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-full flex-1 sm:min-w-[200px] sm:max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search requests..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-8"
        />
      </div>
      <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1) }}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={type} onValueChange={(value) => { setType(value); setPage(1) }}>
        <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="addon_request">Addon Request</SelectItem>
          <SelectItem value="poc_extension">POC Extension</SelectItem>
          <SelectItem value="capacity_change">Capacity Change</SelectItem>
          <SelectItem value="billing_support">Billing Support</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Requests"
        description={data?.meta?.total != null ? `${data.meta.total} admin requests` : 'Review tenant billing and account requests'}
        icon={ClipboardList}
      />

      <DataTable
        data={requests}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        toolbar={toolbar}
        pagination={{ pageIndex: page - 1, pageSize: PER_PAGE }}
        pageCount={data?.meta?.last_page ?? 1}
        onPaginationChange={(state) => setPage(state.pageIndex + 1)}
      />

      <SlideOver
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title="Review Request"
        description={selected?.organization?.name}
        width="lg"
      >
        {selected && (
          <RequestDetail
            request={selected}
            note={reviewNote}
            onNoteChange={setReviewNote}
            isPending={reviewMutation.isPending}
            onReview={(nextStatus) => reviewMutation.mutate({
              id: selected.id,
              status: nextStatus,
              review_note: reviewNote,
            })}
          />
        )}
      </SlideOver>
    </div>
  )
}
