'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  SKIP_REASONS, skipInstallerReading, submitInstallerReading,
  type ReadingResult, type SkipReason,
} from '@/features/odometer/api'
import { errorText, parseReading, readingOutcomeText, type ParsedReading, type ReadingForm } from '@/features/odometer/lib'

const SKIP_LABELS: Record<SkipReason, string> = {
  locked_vehicle: 'Vehicle is locked',
  dashboard_unreadable: 'Dashboard is unreadable',
  no_odometer_display: 'No odometer display',
  other: 'Other reason',
}

/**
 * Asked after a tracker is assigned. It is a prompt, never a condition: finishing is
 * always available, whatever the reading call does, and closing the panel ends the
 * installation just the same.
 */
export function DashboardReadingPrompt({ orgId, vehicleId, plate, onFinish }: {
  orgId: string | number | null
  vehicleId: string | number
  plate: string
  onFinish: () => void
}) {
  const [form, setForm] = useState<ReadingForm>({ value: '', unit: 'km', inspected: false, note: '', zeroConfirmed: false })
  const [skipping, setSkipping] = useState(false)
  const [skipReason, setSkipReason] = useState<SkipReason>('dashboard_unreadable')
  const [skipNote, setSkipNote] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (body: ParsedReading) => submitInstallerReading(orgId!, vehicleId, body),
    onSuccess: (result: ReadingResult) => setDone(readingOutcomeText(result)),
    onError: (error) => setProblem(errorText(error, 'The reading could not be saved. You can finish the installation and enter it later.')),
  })
  const skip = useMutation({
    mutationFn: () => skipInstallerReading(orgId!, vehicleId, { reason: skipReason, note: skipNote.trim() || null }),
    onSuccess: () => setDone('Recorded. The customer’s admins will be asked for a dashboard reading.'),
    onError: (error) => setProblem(errorText(error, 'This could not be recorded. You can still finish the installation.')),
  })
  const busy = save.isPending || skip.isPending

  if (done) {
    return (
      <div className="space-y-4" data-testid="reading-done">
        <p role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">{done}</p>
        <Button className="w-full" onClick={onFinish}>Finish</Button>
      </div>
    )
  }

  const submit = () => {
    setProblem(null)
    const parsed = parseReading(form)
    if (parsed === null) { setProblem('Enter the dashboard reading, or choose “I could not read the dashboard”.'); return }
    if ('error' in parsed) { setProblem(parsed.error); return }
    save.mutate(parsed)
  }
  const isZero = form.value.trim() !== '' && Number(form.value.trim().replace(/,/g, '')) === 0

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/40 p-3 text-sm">
        <p className="font-medium">Dashboard reading for {plate}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The tracker is assigned. Enter what the dashboard odometer shows now. This is optional: you can finish the installation without it.
        </p>
      </div>

      {!orgId && <p role="status" className="text-sm text-muted-foreground">This vehicle’s organization is unknown here, so a reading can’t be recorded. Finish the installation.</p>}

      {orgId && !skipping && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="dash-reading">Dashboard reading</Label>
              <Input id="dash-reading" inputMode="decimal" value={form.value} disabled={busy}
                onChange={e => setForm(f => ({ ...f, value: e.target.value, zeroConfirmed: false }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dash-unit">Unit</Label>
              <select id="dash-unit" value={form.unit} disabled={busy}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value === 'mi' ? 'mi' : 'km' }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
                <option value="km">km</option>
                <option value="mi">miles</option>
              </select>
            </div>
          </div>
          {isZero && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={form.zeroConfirmed} disabled={busy}
                onChange={e => setForm(f => ({ ...f, zeroConfirmed: e.target.checked }))} />
              The dashboard really reads 0
            </label>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={form.inspected} disabled={busy}
              onChange={e => setForm(f => ({ ...f, inspected: e.target.checked }))} />
            I physically inspected the dashboard
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="dash-note">Note (optional)</Label>
            <Input id="dash-note" value={form.note} disabled={busy} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={submit} disabled={busy}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save reading
            </Button>
            <Button variant="outline" onClick={() => { setProblem(null); setSkipping(true) }} disabled={busy}>I could not read the dashboard</Button>
          </div>
        </div>
      )}

      {orgId && skipping && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="skip-reason">Why not?</Label>
            <select id="skip-reason" value={skipReason} disabled={busy}
              onChange={e => setSkipReason(e.target.value as SkipReason)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
              {SKIP_REASONS.map(reason => <option key={reason} value={reason}>{SKIP_LABELS[reason]}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skip-note">Note (optional)</Label>
            <Textarea id="skip-note" className="min-h-16" value={skipNote} disabled={busy} onChange={e => setSkipNote(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => { setProblem(null); skip.mutate() }} disabled={busy}>
              {skip.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record and continue
            </Button>
            <Button variant="outline" onClick={() => { setProblem(null); setSkipping(false) }} disabled={busy}>Back</Button>
          </div>
        </div>
      )}

      {problem && <p role="alert" className="text-sm text-status-error">{problem}</p>}

      <Button variant="ghost" className="w-full" onClick={onFinish}>Finish installation without a reading</Button>
    </div>
  )
}
