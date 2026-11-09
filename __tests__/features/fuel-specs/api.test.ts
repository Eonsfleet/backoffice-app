import { AxiosError, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import {
  apiErrorMessage, approveFuelSpec, createFuelSpec, discardFuelSpecProposal, getFuelSpec, linkFuelSpec, listFuelSpecs, listUnlinkedVehicles, normalizeGroup, normalizeImpact,
  normalizeSpec, normalizeSummary, rejectFuelSpec, updateFuelSpec, type FuelSpecInput,
} from '@/features/fuel-specs/api'

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

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

describe('the calls match the backoffice routes (admin/vehicles/fuel-specs)', () => {
  const entry = { id: 7, make: 'toyota', model: 'hilux', review_status: 'approved' }
  const input: FuelSpecInput = {
    make: 'toyota', model: 'hilux', variant: null, year_from: 2016, year_to: null, vehicle_type: 'truck', fuel_type: 'diesel',
    tank_capacity_liters: 80, consumption_l_per_100km: 9.5, idle_l_per_hour: null, source: 'manual', notes: null,
  }
  beforeEach(() => { vi.clearAllMocks() })

  it('lists with the filters as query parameters and reads the page, summary and pagination', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { specs: [entry], pagination: { total: 46, per_page: 25, current_page: 2, last_page: 2 }, summary: { total: 46, approved: 40, unlinked_vehicles: 18 } } } })

    const page = await listFuelSpecs({ page: 2, per_page: 25, attention: 'unreviewed', review_status: 'approved', search: 'hilux' })

    expect(api.get).toHaveBeenCalledWith('/admin/vehicles/fuel-specs', { params: { page: 2, per_page: 25, attention: 'unreviewed', review_status: 'approved', search: 'hilux' }, signal: undefined })
    expect(page.specs).toHaveLength(1)
    expect(page.pagination).toEqual({ total: 46, per_page: 25, current_page: 2, last_page: 2 })
    expect(page.summary).toMatchObject({ approved: 40, unlinked_vehicles: 18, with_proposal: 0 })
  })

  it('survives an empty answer', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: {} })

    expect(await listFuelSpecs()).toMatchObject({ specs: [], pagination: { total: 0, current_page: 1, last_page: 1 } })
  })

  it('reads one entry with its impact', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { spec: entry, impact: { linked_vehicles: 12, organizations: 3, own_rate_vehicles: 1, with_device: 10 } } } })

    const result = await getFuelSpec(7)

    expect(api.get).toHaveBeenCalledWith('/admin/vehicles/fuel-specs/7', { signal: undefined })
    expect(result.impact).toEqual({ linked_vehicles: 12, organizations: 3, own_rate_vehicles: 1, with_device: 10 })
  })

  it('creates with POST and edits with PATCH, sending the figures as they are', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { spec: entry } } })
    vi.mocked(api.patch).mockResolvedValue({ data: { data: { spec: { ...entry, proposed: { tank_capacity_liters: 76 } } } } })

    await createFuelSpec(input)
    const edited = await updateFuelSpec(7, input)

    expect(api.post).toHaveBeenCalledWith('/admin/vehicles/fuel-specs', input)
    expect(api.patch).toHaveBeenCalledWith('/admin/vehicles/fuel-specs/7', input)
    expect(edited.proposed).toEqual({ tank_capacity_liters: 76 })
  })

  it('approves with a source and notes, rejects, and discards a change', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { spec: entry } } })

    await approveFuelSpec(7, { source: 'Toyota brochure', notes: null })
    await rejectFuelSpec(7, { notes: 'wrong variant' })
    await discardFuelSpecProposal(7)

    expect(api.post).toHaveBeenNthCalledWith(1, '/admin/vehicles/fuel-specs/7/approve', { source: 'Toyota brochure', notes: null })
    expect(api.post).toHaveBeenNthCalledWith(2, '/admin/vehicles/fuel-specs/7/reject', { notes: 'wrong variant' })
    expect(api.post).toHaveBeenNthCalledWith(3, '/admin/vehicles/fuel-specs/7/discard-proposal')
  })

  it('lists vehicles without an entry, with or without a search, and links a group', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { groups: [{ make: 'tvs', model: 'king', vehicles: 4, with_device: 3, organizations: 2 }], summary: { unlinked_vehicles: 4 } } } })
    vi.mocked(api.post).mockResolvedValue({ data: { data: { linked: 3, skipped_outside_years: 1 } } })

    const unlinked = await listUnlinkedVehicles('')
    await listUnlinkedVehicles('tvs')
    const linked = await linkFuelSpec(7, { make: 'tvs', model: 'king', respect_years: true })

    expect(api.get).toHaveBeenNthCalledWith(1, '/admin/vehicles/fuel-specs/unlinked', { params: {}, signal: undefined })
    expect(api.get).toHaveBeenNthCalledWith(2, '/admin/vehicles/fuel-specs/unlinked', { params: { search: 'tvs' }, signal: undefined })
    expect(unlinked.groups[0]).toMatchObject({ make: 'tvs', vehicles: 4, with_device: 3 })
    expect(api.post).toHaveBeenCalledWith('/admin/vehicles/fuel-specs/7/link', { make: 'tvs', model: 'king', respect_years: true })
    expect(linked).toEqual({ linked: 3, skipped_outside_years: 1 })
  })
})
