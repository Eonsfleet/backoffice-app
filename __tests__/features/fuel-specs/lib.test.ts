import { describe, expect, it } from 'vitest'
import type { FuelSpec } from '@/features/fuel-specs/api'
import {
  approvalBlocker, attentionReasons, emptySpecForm, formatFigure, formToPayload, impactSummary, isReviewedSource, proposalDiff, specToForm, validateSpecForm,
} from '@/features/fuel-specs/lib'

const spec = (over: Partial<FuelSpec> = {}): FuelSpec => ({
  id: 1, label: 'Toyota Hilux (2016–2022)', make: 'toyota', model: 'hilux', variant: null, year_from: 2016, year_to: 2022, vehicle_type: 'truck', fuel_type: 'diesel',
  tank_capacity_liters: 80, consumption_l_per_100km: 9.5, idle_l_per_hour: 0.9, source: 'Toyota Hilux owner manual', notes: null, review_status: 'approved',
  reviewed_by: 4, reviewed_by_name: 'Ada', reviewed_at: '2026-10-21T08:00:00Z', proposed: null, proposed_by: null, proposed_by_name: null, proposed_at: null,
  linked_vehicles: 12, flags: { unreviewed: false, draft_source: false }, ...over,
})

describe('sources a reviewer can stand behind', () => {
  it('refuses nothing, blanks and drafts, in any case', () => {
    expect(isReviewedSource(null)).toBe(false)
    expect(isReviewedSource('   ')).toBe(false)
    expect(isReviewedSource('draft: manufacturer spec')).toBe(false)
    expect(isReviewedSource('  Draft: still to check')).toBe(false)
    expect(isReviewedSource('Toyota Hilux owner manual')).toBe(true)
    expect(isReviewedSource('Fleet fuel logs, Oct 2026')).toBe(true)
  })
  it('explains why an approval would be refused, and says nothing when it would not', () => {
    expect(approvalBlocker('draft: estimate')).toContain('Say where these figures come from')
    expect(approvalBlocker('Toyota brochure')).toBeNull()
  })
})

describe('a change waiting beside the approved figures', () => {
  it('shows only what it changes, with units, against what is in force', () => {
    const diff = proposalDiff(spec({ proposed: { consumption_l_per_100km: 11.2, tank_capacity_liters: 76 } }))
    expect(diff).toEqual([
      { key: 'tank_capacity_liters', label: 'Tank capacity', current: '80 L', proposed: '76 L' },
      { key: 'consumption_l_per_100km', label: 'Consumption', current: '9.5 L/100 km', proposed: '11.2 L/100 km' },
    ])
  })
  it('shows a figure that is being cleared, and nothing when nothing is waiting', () => {
    expect(proposalDiff(spec({ proposed: { idle_l_per_hour: null } }))[0]).toMatchObject({ current: '0.9 L/h', proposed: '—' })
    expect(proposalDiff(spec())).toEqual([])
  })
  it('formats figures without noise', () => {
    expect(formatFigure(9.5, 'L/100 km')).toBe('9.5 L/100 km')
    expect(formatFigure(80.004, 'L')).toBe('80 L')
    expect(formatFigure(null, 'L')).toBe('—')
    expect(formatFigure(2016)).toBe('2016')
  })
})

describe('what needs a reviewer', () => {
  it('lists the reasons a person should look, most pressing first', () => {
    expect(attentionReasons(spec())).toEqual([])
    expect(attentionReasons(spec({ proposed: { tank_capacity_liters: 70 }, flags: { unreviewed: true, draft_source: true } }))).toEqual([
      'Change waiting for review', 'Approved with no named reviewer', 'Source still says draft',
    ])
  })
  it('does not call a pending entry unreviewed: it has not been approved', () => {
    expect(attentionReasons(spec({ review_status: 'pending', flags: { unreviewed: true, draft_source: false } }))).toEqual([])
  })
})

describe('what a decision reaches', () => {
  it('says when nothing uses an entry', () => {
    expect(impactSummary({ linked_vehicles: 0, organizations: 0, own_rate_vehicles: 0, with_device: 0 })).toBe('No vehicle uses this entry yet.')
  })
  it('separates the vehicles that take the rates from those with their own', () => {
    const text = impactSummary({ linked_vehicles: 1200, organizations: 9, own_rate_vehicles: 200, with_device: 1100 })
    expect(text).toContain('1,200 vehicles across 9 organizations use this entry')
    expect(text).toContain('200 vehicles keep their own consumption rate')
    expect(text).toContain('1,000 vehicles take its consumption and idle rates')
  })
  it('uses the singular', () => {
    expect(impactSummary({ linked_vehicles: 1, organizations: 1, own_rate_vehicles: 0, with_device: 1 })).toContain('1 vehicle across 1 organization use this entry')
  })
})

describe('the entry form uses the limits the API enforces', () => {
  const valid = { ...emptySpecForm(), make: 'Toyota', model: 'Hilux', tank_capacity_liters: '80' }

  it('needs a make, a model and a tank capacity', () => {
    expect(validateSpecForm(emptySpecForm())).toEqual({ make: 'Enter the make.', model: 'Enter the model.', tank_capacity_liters: 'Enter the tank capacity.' })
    expect(validateSpecForm(valid)).toEqual({})
  })
  it('accepts the limits themselves and refuses beyond them', () => {
    expect(validateSpecForm({ ...valid, tank_capacity_liters: '5000', consumption_l_per_100km: '200', idle_l_per_hour: '50' })).toEqual({})
    const over = validateSpecForm({ ...valid, tank_capacity_liters: '5001', consumption_l_per_100km: '200.5', idle_l_per_hour: '50.1' })
    expect(Object.keys(over).sort()).toEqual(['consumption_l_per_100km', 'idle_l_per_hour', 'tank_capacity_liters'])
  })
  it('refuses zero, negatives and text for a figure', () => {
    for (const bad of ['0', '-3', 'abc']) expect(validateSpecForm({ ...valid, consumption_l_per_100km: bad }).consumption_l_per_100km).toBeDefined()
  })
  it('checks the years', () => {
    expect(validateSpecForm({ ...valid, year_from: '1949' }).year_from).toBeDefined()
    expect(validateSpecForm({ ...valid, year_to: '2101' }).year_to).toBeDefined()
    expect(validateSpecForm({ ...valid, year_from: '2019.5' }).year_from).toBeDefined()
    expect(validateSpecForm({ ...valid, year_from: '2020', year_to: '2019' }).year_to).toContain('cannot be before')
    expect(validateSpecForm({ ...valid, year_from: '2016', year_to: '2022' })).toEqual({})
  })
  it('sends trimmed text, numbers, and null for what is left blank', () => {
    expect(formToPayload({ ...valid, make: ' Toyota ', variant: '', year_from: '2016', consumption_l_per_100km: '9.5', source: '  manual ' })).toEqual({
      make: 'Toyota', model: 'Hilux', variant: null, year_from: 2016, year_to: null, vehicle_type: null, fuel_type: null,
      tank_capacity_liters: 80, consumption_l_per_100km: 9.5, idle_l_per_hour: null, source: 'manual', notes: null,
    })
  })
  it('fills the form from an entry and back without changing it', () => {
    const entry = spec()
    expect(formToPayload(specToForm(entry))).toMatchObject({ make: 'toyota', model: 'hilux', year_from: 2016, year_to: 2022, tank_capacity_liters: 80, consumption_l_per_100km: 9.5, idle_l_per_hour: 0.9, source: 'Toyota Hilux owner manual' })
  })
})
