'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Timestamp } from '@/components/shared/Timestamp'
import { QueryError } from '@/components/shared/QueryError'
import { useAuthStore } from '@/stores/auth.store'
import {
  assignOdometerReview, attachReviewEvidence, decideOdometerReview, listOdometerReviewers, fetchEvidence, getOdometerReview, type OdometerReview,
} from '@/features/odometer/api'
import {
  approvalProgress, canReviewOdometer, errorText, formatKm, originalReading, reasonLabel, reviewAction,
} from '@/features/odometer/lib'

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm">{children}</dd></div>
}

function Evidence({ review, canAttach, onAttached }: { review: OdometerReview; canAttach: boolean; onAttached: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const attach = useMutation({
    mutationFn: (file: File) => attachReviewEvidence(review.id, file),
    onSuccess: onAttached,
    onError: e => setError(errorText(e, 'The photo could not be attached.')),
  })
  const open = async (evidenceId: string | number) => {
    setError(null)
    try {
      const url = URL.createObjectURL(await fetchEvidence(evidenceId))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) { setError(errorText(e, 'The photo could not be opened.')) }
  }
  return (
    <div className="space-y-2">
      <p className="text-sm">
        {review.has_photo ? 'A dashboard photo is attached.' : review.requires_photo ? 'A dashboard photo is required before this can be approved, and none is attached.' : 'No photo attached.'}
      </p>
      {review.evidence.map(file => (
        <Button key={String(file.id)} variant="outline" size="sm" onClick={() => void open(file.id)}>
          View {file.kind?.replace(/_/g, ' ') ?? 'file'}
        </Button>
      ))}
      {canAttach && (
        <div className="space-y-1.5">
          <Label htmlFor="odo-attach">Attach a dashboard photo</Label>
          <input id="odo-attach" type="file" accept="image/*,application/pdf" disabled={attach.isPending}
            className="block w-full text-sm"
            onChange={e => { const file = e.target.files?.[0]; if (file) { setError(null); attach.mutate(file); e.target.value = '' } }} />
          {attach.isPending && <p className="text-xs text-muted-foreground">Uploading…</p>}
        </div>
      )}
      {error && <p role="alert" className="text-xs text-status-error">{error}</p>}
    </div>
  )
}

function Assign({ review, onDone }: { review: OdometerReview; onDone: (r: OdometerReview) => void }) {
  const [adminId, setAdminId] = useState('')
  const admins = useQuery({ queryKey: ['odometer-reviewers'], queryFn: ({ signal }) => listOdometerReviewers(signal), staleTime: 60_000 })
  const assign = useMutation({
    mutationFn: () => assignOdometerReview(review.id, adminId),
    onSuccess: onDone,
  })
  return (
    <div className="space-y-2">
      <Label htmlFor="assign-admin">Assign to</Label>
      <div className="flex gap-2">
        <select id="assign-admin" value={adminId} onChange={e => setAdminId(e.target.value)} disabled={assign.isPending}
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm">
          <option value="">Choose an admin</option>
          {(admins.data ?? []).map(a => <option key={String(a.id)} value={String(a.id)}>{a.name ?? a.email}</option>)}
        </select>
        <Button variant="outline" disabled={!adminId || assign.isPending} onClick={() => assign.mutate()}>
          {assign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Assign
        </Button>
      </div>
      {assign.isError && <p role="alert" className="text-xs text-status-error">{errorText(assign.error, 'The review could not be assigned.')}</p>}
    </div>
  )
}

export function ReviewDetail({ reviewId, initial }: { reviewId: string | number; initial?: OdometerReview }) {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['odometer-review', String(reviewId)],
    queryFn: ({ signal }) => getOdometerReview(reviewId, signal),
    initialData: initial,
    staleTime: 0,
  })
  const [reason, setReason] = useState('')
  const refresh = (review: OdometerReview) => {
    qc.setQueryData(['odometer-review', String(reviewId)], review)
    void qc.invalidateQueries({ queryKey: ['odometer-reviews'] })
  }
  const decide = useMutation({
    mutationFn: (decision: 'approve' | 'reject') => decideOdometerReview(reviewId, decision, reason.trim()),
    onSuccess: review => { setReason(''); refresh(review) },
  })

  if (query.isError && !query.data) return <QueryError error={query.error} retry={() => void query.refetch()} label="this review" />
  const review = query.data
  if (!review) return <p className="text-sm text-muted-foreground">Loading review…</p>

  const action = reviewAction(review, user)
  const progress = approvalProgress(review)
  const original = originalReading(review)
  const needsReason = reason.trim().length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={review.overdue && review.status === 'pending' ? 'overdue' : review.status} />
        <span className="text-sm font-medium">{reasonLabel(review.reason)}</span>
        <span className="text-xs text-muted-foreground capitalize">{review.level} level</span>
      </div>

      <dl className="grid grid-cols-2 gap-4">
        <Fact label="Vehicle">{review.vehicle?.registration_number ?? 'Unavailable'}</Fact>
        <Fact label="Responsible">{review.responsible?.name ?? 'Unassigned'}</Fact>
        <Fact label="Last accepted total">{formatKm(review.previous_accepted_km)}</Fact>
        <Fact label="Submitted reading">{formatKm(review.proposed_km)}{original && <span className="block text-xs text-muted-foreground">entered as {original}</span>}</Fact>
        <Fact label="Reading taken"><Timestamp value={review.reading?.effective_at} /></Fact>
        <Fact label="Opened"><Timestamp value={review.created_at} /></Fact>
        {review.resolved_at && <Fact label="Resolved"><Timestamp value={review.resolved_at} /></Fact>}
      </dl>

      <section aria-labelledby="odo-photo" className="space-y-2">
        <h3 id="odo-photo" className="text-sm font-semibold">Dashboard photo</h3>
        <Evidence review={review} canAttach={review.status === 'pending' && canReviewOdometer(user)} onAttached={() => void query.refetch()} />
      </section>

      <section aria-labelledby="odo-approvals" className="space-y-2">
        <h3 id="odo-approvals" className="text-sm font-semibold">Approvals</h3>
        {progress && <p className="text-sm" data-testid="approval-progress">{progress}</p>}
        {review.approvals.length === 0 ? <p className="text-sm text-muted-foreground">No decisions yet.</p> : (
          <ul className="space-y-2 text-sm">
            {review.approvals.map((a, i) => (
              <li key={i} className="rounded border p-2">
                <span className="font-medium">{a.by?.name ?? 'Unknown'}</span> {a.decision}
                {a.reason && <span className="block text-muted-foreground">{a.reason}</span>}
                <span className="block"><Timestamp value={a.at} /></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="odo-history" className="space-y-2">
        <h3 id="odo-history" className="text-sm font-semibold">History</h3>
        {review.history.length === 0 ? <p className="text-sm text-muted-foreground">No history recorded.</p> : (
          <ol className="space-y-2 border-l pl-4 text-sm">
            {review.history.map((h, i) => (
              <li key={i}>
                <span className="font-medium capitalize">{h.event.replace(/_/g, ' ')}</span>
                {h.by?.name && <span className="text-muted-foreground"> by {h.by.name}</span>}
                {h.detail && <span className="block text-muted-foreground">{h.detail}</span>}
                <span className="block"><Timestamp value={h.at} /></span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {review.status === 'pending' && user && <Assign review={review} onDone={refresh} />}

      {action.allowed ? (
        <section aria-labelledby="odo-decide" className="space-y-3">
          <h3 id="odo-decide" className="text-sm font-semibold">Decision</h3>
          <div className="space-y-1.5">
            <Label htmlFor="odo-reason">Reason (required)</Label>
            <Textarea id="odo-reason" value={reason} onChange={e => setReason(e.target.value)} disabled={decide.isPending} />
          </div>
          {decide.isError && <p role="alert" className="text-sm text-status-error">{errorText(decide.error, 'The decision could not be saved.')}</p>}
          <div className="flex gap-2">
            <Button className="flex-1" disabled={needsReason || decide.isPending} onClick={() => decide.mutate('approve')}>Approve</Button>
            <Button variant="destructive" className="flex-1" disabled={needsReason || decide.isPending} onClick={() => decide.mutate('reject')}>Reject</Button>
          </div>
        </section>
      ) : (
        <p role="status" className="rounded-lg border bg-muted/40 p-3 text-sm" data-testid="read-only-note">
          {action.reason === 'read_only' && 'Read only: deciding odometer reviews needs the odometer reviewer permission.'}
          {action.reason === 'already_approved' && 'You have already approved this review. A different reviewer must give the next approval.'}
          {action.reason === 'resolved' && 'This review is resolved.'}
        </p>
      )}
    </div>
  )
}
