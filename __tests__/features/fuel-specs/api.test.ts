import { AxiosError, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { apiErrorMessage, normalizeGroup, normalizeImpact, normalizeSpec, normalizeSummary } from '@/features/fuel-specs/api'

describe('what the API returns is read defensively', () => {
  it('reads an entry, numbers sent as text included', () => {
    const spec = normalizeSpec({
      id: 7, label: 'Toyota Hilux', make: 'toyota', model: 'hilux', variant: null, year_from: 2016, tank_capacity_liters: '80.00', consumption_l_per_100km: 9.5,
      review_status: 'approved', reviewed_by: 4, reviewed_by_name: 'Ada', linked_vehicles: '12', flags: { unreviewed: true, draft_source: false },
      proposed: { consumption_l_per_100km: '11.2', variant: null }, proposed_by_name: 'Sam',
    })
    expect(spec).toMatchObject({ id: 7, tank_capacity_liters: 80, linked_vehicles: 12, review_status: 'approved', flags: { unreviewed: true, draft_source: false }, proposed_by_name: 'Sam' })
    expect(spec.proposed).toEqual({ consumption_l_per_100km: 11.2, variant: null })
  })
  it('treats a missing or unknown status as pending, and missing flags as none', () => {
    const spec = normalizeSpec({ id: 1, make: 'tvs', model: 'king', review_status: 'something-new' })
    expect(spec.review_status).toBe('pending')
    expect(spec.flags).toEqual({ unreviewed: false, draft_source: false })
    expect(spec.label).toBe('tvs king')
    expect(spec.proposed).toBeNull()
    expect(spec.linked_vehicles).toBeNull()
  })
  it('does not invent a proposal from an empty or wrong value', () => {
    expect(normalizeSpec({ id: 1, make: 'a', model: 'b', proposed: {} }).proposed).toBeNull()
    expect(normalizeSpec({ id: 1, make: 'a', model: 'b', proposed: [] }).proposed).toBeNull()
    expect(normalizeSpec({ id: 1, make: 'a', model: 'b', proposed: 'x' }).proposed).toBeNull()
  })
  it('counts what is missing as zero', () => {
    expect(normalizeSummary(undefined)).toEqual({ total: 0, approved: 0, pending: 0, rejected: 0, unreviewed: 0, draft_source: 0, with_proposal: 0, unlinked_vehicles: 0 })
    expect(normalizeImpact({ linked_vehicles: 3 })).toEqual({ linked_vehicles: 3, organizations: 0, own_rate_vehicles: 0, with_device: 0 })
    expect(normalizeGroup({ make: 'toyota', model: 'hilux', vehicles: '5', year_from: null })).toMatchObject({ vehicles: 5, year_from: null, organizations: 0 })
  })
})

describe('a refused request says why', () => {
  const failure = (data: unknown, status = 422) => new AxiosError('Request failed', String(status), undefined, undefined, { data, status } as AxiosResponse)

  it('uses the API message', () => {
    expect(apiErrorMessage(failure({ message: 'Say where these figures come from.' }))).toBe('Say where these figures come from.')
  })
  it('falls back when there is no message or it is not an API error', () => {
    expect(apiErrorMessage(failure({}))).toBe('Something went wrong. Try again.')
    expect(apiErrorMessage(failure({ message: '  ' }), 'Custom')).toBe('Custom')
    expect(apiErrorMessage(new Error('boom'))).toBe('Something went wrong. Try again.')
  })
})
