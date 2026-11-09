'use client'

import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Pencil, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { apiErrorMessage, approveFuelSpec, discardFuelSpecProposal, getFuelSpec, rejectFuelSpec, type FuelSpec } from '../api'
import { approvalBlocker, attentionReasons, formatFigure, impactSummary, proposalDiff } from '../lib'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { QueryError } from '@/components/shared/QueryError'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Timestamp } from '@/components/shared/Timestamp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4 border-b py-2 text-sm last:border-0"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{children}</dd></div>
}

/** Everything a reviewer needs to decide on an entry or on the change waiting beside it. */
export function SpecReviewSheet({ id, canManage, onClose, onEdit }: { id: number; canManage: boolean; onClose: () => void; onEdit: (spec: FuelSpec) => void }) {
  const qc = useQueryClient()
  const field = useId()
  const query = useQuery({ queryKey: ['fuel-spec', id], queryFn: ({ signal }) => getFuelSpec(id, signal) })
  const spec = query.data?.spec
  const impact = query.data?.impact
  const [source, setSource] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [confirm, setConfirm] = useState<'reject' | 'discard' | null>(null)

  const refresh = () => { void qc.invalidateQueries({ queryKey: ['fuel-specs'] }); void qc.invalidateQueries({ queryKey: ['fuel-spec', id] }) }
  const approve = useMutation({
    mutationFn: () => approveFuelSpec(id, { source: (source ?? spec?.source ?? '').trim() || null, notes: notes.trim() || null }),
    onSuccess: saved => { refresh(); toast.success(saved.proposed ? 'Approved' : 'Approved. Its vehicles pick the rates up with the next hourly sync.'); onClose() },
  })
  const reject = useMutation({ mutationFn: () => rejectFuelSpec(id, { notes: notes.trim() || null }), onSuccess: () => { refresh(); toast.success('Entry rejected'); onClose() } })
  const discard = useMutation({ mutationFn: () => discardFuelSpecProposal(id), onSuccess: () => { refresh(); toast.success('Proposed change discarded'); setConfirm(null) } })

  const effectiveSource = source ?? spec?.source ?? ''
  const blocker = spec ? approvalBlocker(effectiveSource) : null
  const diff = spec ? proposalDiff(spec) : []
  const reasons = spec ? attentionReasons(spec) : []
  const needsApproval = !!spec && (spec.review_status !== 'approved' || spec.proposed !== null || spec.flags.unreviewed)
  const inUse = (impact?.linked_vehicles ?? 0) > 0

  return (
    <>
      <Sheet open onOpenChange={open => { if (!open) onClose() }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{spec?.label ?? 'Fuel reference entry'}</SheetTitle>
            <SheetDescription>Typical figures for a make and model. Vehicles linked to an approved entry take their consumption and idle rates from it.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-6">
            {query.isPending && <div className="space-y-2"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-32 w-full" /></div>}
            {query.isError && <QueryError error={query.error} retry={() => void query.refetch()} />}
            {spec && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={spec.review_status} />
                  {reasons.map(reason => <StatusBadge key={reason} status={reason} variant={reason.startsWith('Change') ? 'info' : 'warning'} className="normal-case" />)}
                </div>

                <section aria-label="What this entry drives" className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">What it drives</p>
                  <p className="mt-1 text-muted-foreground">{spec.review_status === 'approved' ? impactSummary(impact) : 'Not in use: only approved entries feed a vehicle’s rates.'}</p>
                </section>

                {diff.length > 0 && (
                  <section aria-label="Change waiting for review" className="space-y-2 rounded-md border border-status-info/30 bg-status-info-surface p-3">
                    <p className="text-sm font-medium">Change waiting for review</p>
                    <p className="text-xs text-muted-foreground">Proposed{spec.proposed_by_name ? ` by ${spec.proposed_by_name}` : ''}{spec.proposed_at ? <> on <Timestamp value={spec.proposed_at} /></> : null}. The approved figures stay in force until this is approved.</p>
                    <dl>{diff.map(row => <Row key={row.key} label={row.label}><span className="text-muted-foreground line-through">{row.current}</span> → {row.proposed}</Row>)}</dl>
                    {inUse && <p className="text-xs">Approving changes the rates for {impact?.linked_vehicles.toLocaleString()} vehicle(s).</p>}
                  </section>
                )}

                <dl aria-label="Approved figures">
                  <Row label="Tank capacity">{formatFigure(spec.tank_capacity_liters, 'L')}</Row>
                  <Row label="Consumption">{formatFigure(spec.consumption_l_per_100km, 'L/100 km')}</Row>
                  <Row label="Idle burn">{formatFigure(spec.idle_l_per_hour, 'L/h')}</Row>
                  <Row label="Years">{spec.year_from ? `${spec.year_from}–${spec.year_to ?? 'present'}` : 'Any'}</Row>
                  <Row label="Type / fuel"><span className="capitalize">{[spec.vehicle_type, spec.fuel_type].filter(Boolean).join(' · ') || '—'}</span></Row>
                  <Row label="Source">{spec.source ?? '—'}</Row>
                  <Row label="Reviewed by">{spec.reviewed_at ? <>{spec.reviewed_by_name ?? 'No named reviewer'} · <Timestamp value={spec.reviewed_at} /></> : 'Not reviewed'}</Row>
                  {spec.notes && <Row label="Notes">{spec.notes}</Row>}
                </dl>

                {canManage && (
                  <section aria-label="Review" className="space-y-3 border-t pt-4">
                    {spec.review_status !== 'rejected' && needsApproval && (
                      <>
                        <div>
                          <label htmlFor={`${field}-source`} className="mb-1.5 block text-sm font-medium">Source</label>
                          <Input id={`${field}-source`} value={effectiveSource} onChange={event => setSource(event.target.value)} disabled={approve.isPending} aria-invalid={!!blocker} aria-describedby={blocker ? `${field}-blocker` : undefined} />
                          {blocker && <p id={`${field}-blocker`} className="mt-1 flex items-start gap-1.5 text-xs text-status-warning"><AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{blocker}</p>}
                        </div>
                        <div>
                          <label htmlFor={`${field}-notes`} className="mb-1.5 block text-sm font-medium">Review notes (optional)</label>
                          <Textarea id={`${field}-notes`} value={notes} onChange={event => setNotes(event.target.value)} rows={2} disabled={approve.isPending || reject.isPending} />
                        </div>
                      </>
                    )}
                    {(approve.isError || reject.isError || discard.isError) && <p role="alert" className="rounded-md border border-status-error/30 bg-status-error-surface p-3 text-sm text-status-error">{apiErrorMessage(approve.error ?? reject.error ?? discard.error)}</p>}
                    <div className="flex flex-wrap gap-2">
                      {spec.review_status !== 'rejected' && needsApproval && (
                        <Button onClick={() => approve.mutate()} disabled={!!blocker || approve.isPending}><CheckCircle2 aria-hidden="true" className="mr-1.5 h-4 w-4" />{approve.isPending ? 'Approving…' : spec.proposed ? 'Approve change' : spec.review_status === 'approved' ? 'Confirm review' : 'Approve'}</Button>
                      )}
                      <Button variant="outline" onClick={() => onEdit(spec)}><Pencil aria-hidden="true" className="mr-1.5 h-4 w-4" />Edit</Button>
                      {spec.proposed && <Button variant="outline" onClick={() => { discard.reset(); setConfirm('discard') }}><Trash2 aria-hidden="true" className="mr-1.5 h-4 w-4" />Discard change</Button>}
                      {spec.review_status !== 'rejected' && <Button variant="ghost" className="text-status-error" onClick={() => { reject.reset(); setConfirm('reject') }}><XCircle aria-hidden="true" className="mr-1.5 h-4 w-4" />Reject</Button>}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
      {confirm === 'reject' && (
        <ConfirmDialog
          open onOpenChange={open => { if (!open) setConfirm(null) }} title="Reject this entry?"
          description={spec?.review_status === 'approved' && inUse
            ? `${impact?.linked_vehicles.toLocaleString()} vehicles use this entry. Rejecting it stops their fuel estimates until another entry is linked, and drops any change waiting on it.`
            : 'It will no longer be offered at onboarding or used for estimates, and any change waiting on it is dropped.'}
          confirmLabel="Reject entry" onConfirm={async () => { await reject.mutateAsync() }}
        />
      )}
      {confirm === 'discard' && (
        <ConfirmDialog open onOpenChange={open => { if (!open) setConfirm(null) }} title="Discard the proposed change?" description="The approved figures stay as they are. The proposal is dropped." confirmLabel="Discard change" variant="default" onConfirm={async () => { await discard.mutateAsync() }} />
      )}
    </>
  )
}
