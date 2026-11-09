import type { FuelSpec, FuelSpecFigures, FuelSpecImpact, FuelSpecInput } from './api'

export const VEHICLE_TYPES = ['car', 'van', 'truck', 'bus', 'motorcycle', 'tricycle'] as const
export const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'lpg', 'electric', 'hybrid'] as const

export const FIGURE_FIELDS: { key: keyof FuelSpecFigures; label: string; unit: string }[] = [
  { key: 'tank_capacity_liters', label: 'Tank capacity', unit: 'L' },
  { key: 'consumption_l_per_100km', label: 'Consumption', unit: 'L/100 km' },
  { key: 'idle_l_per_hour', label: 'Idle burn', unit: 'L/h' },
  { key: 'make', label: 'Make', unit: '' },
  { key: 'model', label: 'Model', unit: '' },
  { key: 'variant', label: 'Variant', unit: '' },
  { key: 'year_from', label: 'First year', unit: '' },
  { key: 'year_to', label: 'Last year', unit: '' },
]

export function formatFigure(value: string | number | null | undefined, unit = ''): string {
  if (value === null || value === undefined || value === '') return '—'
  const shown = typeof value === 'number' ? String(Math.round(value * 100) / 100) : value
  return unit ? `${shown} ${unit}` : shown
}

export interface DiffRow {
  key: keyof FuelSpecFigures
  label: string
  current: string
  proposed: string
}

/** What a waiting change would alter: only the figures it changes, as shown. */
export function proposalDiff(spec: Pick<FuelSpec, 'proposed'> & FuelSpecFigures): DiffRow[] {
  const proposed = spec.proposed
  if (!proposed) return []
  return FIGURE_FIELDS.filter(field => field.key in proposed).map(field => ({
    key: field.key,
    label: field.label,
    current: formatFigure(spec[field.key], field.unit),
    proposed: formatFigure(proposed[field.key], field.unit),
  }))
}

/** A source a reviewer can stand behind: stated, and not an unreviewed draft. Mirrors the API. */
export function isReviewedSource(source: string | null | undefined): boolean {
  const value = (source ?? '').trim().toLowerCase()
  return value !== '' && !value.startsWith('draft')
}

/** Why an entry needs a person to look at it, in the order a reviewer should care. */
export function attentionReasons(spec: Pick<FuelSpec, 'review_status' | 'proposed' | 'flags'>): string[] {
  const reasons: string[] = []
  if (spec.proposed) reasons.push('Change waiting for review')
  if (spec.review_status === 'approved' && spec.flags.unreviewed) reasons.push('Approved with no named reviewer')
  if (spec.flags.draft_source) reasons.push('Source still says draft')
  return reasons
}

/** The reason an approval would be refused, or null when it can go ahead. */
export function approvalBlocker(source: string | null | undefined): string | null {
  return isReviewedSource(source)
    ? null
    : 'Say where these figures come from (a manufacturer manual or page, or a measurement). A "draft" source has not been checked against anything.'
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`

/** What approving, changing or removing an entry reaches, in plain words. */
export function impactSummary(impact: FuelSpecImpact | undefined): string {
  if (!impact) return ''
  if (impact.linked_vehicles === 0) return 'No vehicle uses this entry yet.'
  const using = impact.linked_vehicles - impact.own_rate_vehicles
  const base = `${plural(impact.linked_vehicles, 'vehicle')} across ${plural(impact.organizations, 'organization')} use this entry`
  const own = impact.own_rate_vehicles > 0 ? `; ${plural(impact.own_rate_vehicles, 'vehicle')} keep their own consumption rate` : ''
  return `${base}${own}. ${plural(Math.max(using, 0), 'vehicle')} take its consumption and idle rates.`
}

export interface SpecFormValues {
  make: string
  model: string
  variant: string
  year_from: string
  year_to: string
  vehicle_type: string
  fuel_type: string
  tank_capacity_liters: string
  consumption_l_per_100km: string
  idle_l_per_hour: string
  source: string
  notes: string
}

export const emptySpecForm = (): SpecFormValues => ({
  make: '', model: '', variant: '', year_from: '', year_to: '', vehicle_type: '', fuel_type: '',
  tank_capacity_liters: '', consumption_l_per_100km: '', idle_l_per_hour: '', source: '', notes: '',
})

const show = (value: number | null) => (value === null ? '' : String(value))

export function specToForm(spec: FuelSpec): SpecFormValues {
  return {
    make: spec.make, model: spec.model, variant: spec.variant ?? '', year_from: show(spec.year_from), year_to: show(spec.year_to),
    vehicle_type: spec.vehicle_type ?? '', fuel_type: spec.fuel_type ?? '', tank_capacity_liters: show(spec.tank_capacity_liters),
    consumption_l_per_100km: show(spec.consumption_l_per_100km), idle_l_per_hour: show(spec.idle_l_per_hour), source: spec.source ?? '', notes: spec.notes ?? '',
  }
}

const toNumber = (value: string): number | null => (value.trim() === '' ? null : Number(value))

/** Field errors, using the limits the API enforces. An empty object means the form can be sent. */
export function validateSpecForm(values: SpecFormValues): Partial<Record<keyof SpecFormValues, string>> {
  const errors: Partial<Record<keyof SpecFormValues, string>> = {}
  if (!values.make.trim()) errors.make = 'Enter the make.'
  else if (values.make.length > 64) errors.make = 'Make must be 64 characters or fewer.'
  if (!values.model.trim()) errors.model = 'Enter the model.'
  else if (values.model.length > 64) errors.model = 'Model must be 64 characters or fewer.'
  if (values.variant.length > 96) errors.variant = 'Variant must be 96 characters or fewer.'

  const range = (key: 'tank_capacity_liters' | 'consumption_l_per_100km' | 'idle_l_per_hour', max: number, label: string, required = false) => {
    const n = toNumber(values[key])
    if (n === null) { if (required) errors[key] = `Enter the ${label}.`; return }
    if (!Number.isFinite(n) || n <= 0) errors[key] = `The ${label} must be a number above 0.`
    else if (n > max) errors[key] = `The ${label} must be ${max} or less.`
  }
  range('tank_capacity_liters', 5000, 'tank capacity', true)
  range('consumption_l_per_100km', 200, 'consumption')
  range('idle_l_per_hour', 50, 'idle burn')

  const from = toNumber(values.year_from)
  const to = toNumber(values.year_to)
  for (const [key, n] of [['year_from', from], ['year_to', to]] as const) {
    if (n !== null && (!Number.isInteger(n) || n < 1950 || n > 2100)) errors[key] = 'Use a year between 1950 and 2100.'
  }
  if (!errors.year_from && !errors.year_to && from !== null && to !== null && to < from) errors.year_to = 'The last year cannot be before the first.'
  if (values.source.length > 255) errors.source = 'Source must be 255 characters or fewer.'
  if (values.notes.length > 2000) errors.notes = 'Notes must be 2,000 characters or fewer.'
  return errors
}

export function formToPayload(values: SpecFormValues): FuelSpecInput {
  const blank = (value: string) => (value.trim() === '' ? null : value.trim())
  return {
    make: values.make.trim(), model: values.model.trim(), variant: blank(values.variant),
    year_from: toNumber(values.year_from), year_to: toNumber(values.year_to),
    vehicle_type: blank(values.vehicle_type), fuel_type: blank(values.fuel_type),
    tank_capacity_liters: Number(values.tank_capacity_liters),
    consumption_l_per_100km: toNumber(values.consumption_l_per_100km), idle_l_per_hour: toNumber(values.idle_l_per_hour),
    source: blank(values.source), notes: blank(values.notes),
  }
}
