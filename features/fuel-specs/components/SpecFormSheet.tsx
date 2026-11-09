'use client'

import { useId, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage, createFuelSpec, updateFuelSpec, type FuelSpec } from '../api'
import { emptySpecForm, formToPayload, FUEL_TYPES, specToForm, validateSpecForm, VEHICLE_TYPES, type SpecFormValues } from '../lib'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const NONE = '__none__'

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-status-error">{error}</p>}
    </div>
  )
}

/** Add an entry, or edit one. An approved entry is not changed by an edit: the change waits for review. */
export function SpecFormSheet({ spec, onClose }: { spec?: FuelSpec; onClose: () => void }) {
  const qc = useQueryClient()
  const id = useId()
  const initial = spec ? specToForm(spec) : emptySpecForm()
  const [values, setValues] = useState<SpecFormValues>(initial)
  const [submitted, setSubmitted] = useState(false)
  const [discard, setDiscard] = useState(false)
  const errors = validateSpecForm(values)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const proposes = spec?.review_status === 'approved'

  const mutation = useMutation({
    mutationFn: () => (spec ? updateFuelSpec(spec.id, formToPayload(values)) : createFuelSpec(formToPayload(values))),
    onSuccess: saved => {
      void qc.invalidateQueries({ queryKey: ['fuel-specs'] })
      void qc.invalidateQueries({ queryKey: ['fuel-spec'] })
      toast.success(!spec ? 'Entry added for review' : saved.proposed ? 'Change proposed. The approved figures stay in force until it is approved.' : 'Entry saved')
      onClose()
    },
  })

  const set = (key: keyof SpecFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues(current => ({ ...current, [key]: event.target.value }))
  const setChoice = (key: 'vehicle_type' | 'fuel_type') => (value: string) => setValues(current => ({ ...current, [key]: value === NONE ? '' : value }))
  const shown = (key: keyof SpecFormValues) => (submitted ? errors[key] : undefined)
  const close = () => { if (mutation.isPending) return; if (dirty) setDiscard(true); else onClose() }

  return (
    <>
      <Sheet open onOpenChange={open => { if (!open) close() }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{spec ? `Edit ${spec.label}` : 'Add a fuel reference entry'}</SheetTitle>
            <SheetDescription>
              {proposes
                ? 'This entry is approved and in use. Your change is kept as a proposal beside it, and the approved figures stay in force until a reviewer approves it.'
                : 'New entries start as pending and are not used or offered until a reviewer approves them.'}
            </SheetDescription>
          </SheetHeader>
          <form
            className="space-y-4 px-4 pb-6"
            onSubmit={event => { event.preventDefault(); setSubmitted(true); if (Object.keys(errors).length === 0) mutation.mutate() }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${id}-make`} label="Make" error={shown('make')}><Input id={`${id}-make`} value={values.make} onChange={set('make')} aria-invalid={!!shown('make')} disabled={mutation.isPending} /></Field>
              <Field id={`${id}-model`} label="Model" error={shown('model')}><Input id={`${id}-model`} value={values.model} onChange={set('model')} aria-invalid={!!shown('model')} disabled={mutation.isPending} /></Field>
            </div>
            <Field id={`${id}-variant`} label="Variant (optional)" error={shown('variant')} hint="For example a trim or engine, when the figures differ by it.">
              <Input id={`${id}-variant`} value={values.variant} onChange={set('variant')} disabled={mutation.isPending} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${id}-from`} label="First year (optional)" error={shown('year_from')}><Input id={`${id}-from`} inputMode="numeric" value={values.year_from} onChange={set('year_from')} disabled={mutation.isPending} /></Field>
              <Field id={`${id}-to`} label="Last year (optional)" error={shown('year_to')}><Input id={`${id}-to`} inputMode="numeric" value={values.year_to} onChange={set('year_to')} disabled={mutation.isPending} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${id}-type`} label="Vehicle type">
                <Select value={values.vehicle_type || NONE} onValueChange={setChoice('vehicle_type')} disabled={mutation.isPending}>
                  <SelectTrigger id={`${id}-type`}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value={NONE}>Not set</SelectItem>{VEHICLE_TYPES.map(type => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field id={`${id}-fuel`} label="Fuel type">
                <Select value={values.fuel_type || NONE} onValueChange={setChoice('fuel_type')} disabled={mutation.isPending}>
                  <SelectTrigger id={`${id}-fuel`}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value={NONE}>Not set</SelectItem>{FUEL_TYPES.map(type => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id={`${id}-tank`} label="Tank (L)" error={shown('tank_capacity_liters')}><Input id={`${id}-tank`} inputMode="decimal" value={values.tank_capacity_liters} onChange={set('tank_capacity_liters')} aria-invalid={!!shown('tank_capacity_liters')} disabled={mutation.isPending} /></Field>
              <Field id={`${id}-cons`} label="Consumption (L/100 km)" error={shown('consumption_l_per_100km')}><Input id={`${id}-cons`} inputMode="decimal" value={values.consumption_l_per_100km} onChange={set('consumption_l_per_100km')} disabled={mutation.isPending} /></Field>
              <Field id={`${id}-idle`} label="Idle burn (L/h)" error={shown('idle_l_per_hour')}><Input id={`${id}-idle`} inputMode="decimal" value={values.idle_l_per_hour} onChange={set('idle_l_per_hour')} disabled={mutation.isPending} /></Field>
            </div>
            <Field id={`${id}-source`} label="Source" error={shown('source')} hint="Where the figures come from: a manual, a manufacturer page, a measurement. Approval needs one that is not a draft.">
              <Input id={`${id}-source`} value={values.source} onChange={set('source')} disabled={mutation.isPending} />
            </Field>
            <Field id={`${id}-notes`} label="Notes (optional)" error={shown('notes')}><Textarea id={`${id}-notes`} value={values.notes} onChange={set('notes')} rows={3} disabled={mutation.isPending} /></Field>
            {mutation.isError && <p role="alert" className="rounded-md border border-status-error/30 bg-status-error-surface p-3 text-sm text-status-error">{apiErrorMessage(mutation.error, 'Could not save the entry. Your changes are kept; try again.')}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={mutation.isPending || !dirty}>{mutation.isPending ? 'Saving…' : proposes ? 'Propose change' : spec ? 'Save entry' : 'Add entry'}</Button>
              <Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}>Cancel</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
      <ConfirmDialog open={discard} onOpenChange={setDiscard} title="Discard your changes?" description="What you have entered will be lost." confirmLabel="Discard changes" onConfirm={onClose} />
    </>
  )
}
