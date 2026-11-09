import axios from 'axios'
import { api } from '@/lib/api/client'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

/** What a reviewer signs off on, and what a proposal can change. */
export interface FuelSpecFigures {
  make: string
  model: string
  variant: string | null
  year_from: number | null
  year_to: number | null
  tank_capacity_liters: number | null
  consumption_l_per_100km: number | null
  idle_l_per_hour: number | null
}

export interface FuelSpec extends FuelSpecFigures {
  id: number
  label: string
  vehicle_type: string | null
  fuel_type: string | null
  source: string | null
  notes: string | null
  review_status: ReviewStatus
  reviewed_by: number | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  /** A change waiting for review beside the approved figures. */
  proposed: Partial<FuelSpecFigures> | null
  proposed_by: number | null
  proposed_by_name: string | null
  proposed_at: string | null
  /** Vehicles that use this entry. Null where the API did not count them. */
  linked_vehicles: number | null
  flags: { unreviewed: boolean; draft_source: boolean }
}

export interface FuelSpecSummary {
  total: number
  approved: number
  pending: number
  rejected: number
  unreviewed: number
  draft_source: number
  with_proposal: number
  unlinked_vehicles: number
}

export interface FuelSpecImpact {
  linked_vehicles: number
  organizations: number
  /** Vehicles with their own consumption rate: they do not use the entry's. */
  own_rate_vehicles: number
  with_device: number
}

export interface UnlinkedGroup {
  make: string
  model: string
  vehicles: number
  with_device: number
  organizations: number
  year_from: number | null
  year_to: number | null
}

export interface FuelSpecPage {
  specs: FuelSpec[]
  pagination: { total: number; per_page: number; current_page: number; last_page: number }
  summary: FuelSpecSummary
}

export interface FuelSpecListParams {
  page?: number
  per_page?: number
  search?: string
  review_status?: string
  attention?: string
}

export interface FuelSpecInput {
  make: string
  model: string
  variant: string | null
  year_from: number | null
  year_to: number | null
  vehicle_type: string | null
  fuel_type: string | null
  tank_capacity_liters: number
  consumption_l_per_100km: number | null
  idle_l_per_hour: number | null
  source: string | null
  notes: string | null
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null)
const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}
const count = (value: unknown): number => num(value) ?? 0

type Raw = Record<string, unknown>

function normalizeProposal(value: unknown): Partial<FuelSpecFigures> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Raw
  const out: Partial<FuelSpecFigures> = {}
  for (const key of ['tank_capacity_liters', 'consumption_l_per_100km', 'idle_l_per_hour', 'year_from', 'year_to'] as const) {
    if (key in raw) out[key] = num(raw[key])
  }
  for (const key of ['make', 'model'] as const) {
    if (key in raw) out[key] = text(raw[key]) ?? ''
  }
  if ('variant' in raw) out.variant = text(raw.variant)
  return Object.keys(out).length > 0 ? out : null
}

export function normalizeSpec(raw: Raw): FuelSpec {
  const status = raw.review_status
  const flags = (raw.flags ?? {}) as Raw
  return {
    id: Number(raw.id),
    label: text(raw.label) ?? `${text(raw.make) ?? ''} ${text(raw.model) ?? ''}`.trim(),
    make: text(raw.make) ?? '',
    model: text(raw.model) ?? '',
    variant: text(raw.variant),
    year_from: num(raw.year_from),
    year_to: num(raw.year_to),
    vehicle_type: text(raw.vehicle_type),
    fuel_type: text(raw.fuel_type),
    tank_capacity_liters: num(raw.tank_capacity_liters),
    consumption_l_per_100km: num(raw.consumption_l_per_100km),
    idle_l_per_hour: num(raw.idle_l_per_hour),
    source: text(raw.source),
    notes: text(raw.notes),
    review_status: status === 'approved' || status === 'rejected' ? status : 'pending',
    reviewed_by: num(raw.reviewed_by),
    reviewed_by_name: text(raw.reviewed_by_name),
    reviewed_at: text(raw.reviewed_at),
    proposed: normalizeProposal(raw.proposed),
    proposed_by: num(raw.proposed_by),
    proposed_by_name: text(raw.proposed_by_name),
    proposed_at: text(raw.proposed_at),
    linked_vehicles: num(raw.linked_vehicles),
    flags: { unreviewed: flags.unreviewed === true, draft_source: flags.draft_source === true },
  }
}

export function normalizeSummary(raw: unknown): FuelSpecSummary {
  const s = (raw ?? {}) as Raw
  return {
    total: count(s.total), approved: count(s.approved), pending: count(s.pending), rejected: count(s.rejected),
    unreviewed: count(s.unreviewed), draft_source: count(s.draft_source), with_proposal: count(s.with_proposal), unlinked_vehicles: count(s.unlinked_vehicles),
  }
}

export function normalizeImpact(raw: unknown): FuelSpecImpact {
  const i = (raw ?? {}) as Raw
  return { linked_vehicles: count(i.linked_vehicles), organizations: count(i.organizations), own_rate_vehicles: count(i.own_rate_vehicles), with_device: count(i.with_device) }
}

export function normalizeGroup(raw: Raw): UnlinkedGroup {
  return {
    make: text(raw.make) ?? '', model: text(raw.model) ?? '', vehicles: count(raw.vehicles), with_device: count(raw.with_device),
    organizations: count(raw.organizations), year_from: num(raw.year_from), year_to: num(raw.year_to),
  }
}

const dataOf = (body: unknown): Raw => ((body as { data?: Raw } | null)?.data ?? {}) as Raw

/** The message the API gave for a refused request (a 422 says what to fix), else a plain fallback. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

export async function listFuelSpecs(params: FuelSpecListParams = {}, signal?: AbortSignal): Promise<FuelSpecPage> {
  const { data: body } = await api.get('/admin/vehicles/fuel-specs', { params, signal })
  const data = dataOf(body)
  const pagination = (data.pagination ?? {}) as Raw
  const specs = Array.isArray(data.specs) ? (data.specs as Raw[]).map(normalizeSpec) : []
  return {
    specs,
    pagination: { total: count(pagination.total) || specs.length, per_page: count(pagination.per_page) || specs.length, current_page: count(pagination.current_page) || 1, last_page: count(pagination.last_page) || 1 },
    summary: normalizeSummary(data.summary),
  }
}

export async function getFuelSpec(id: number, signal?: AbortSignal): Promise<{ spec: FuelSpec; impact: FuelSpecImpact }> {
  const { data: body } = await api.get(`/admin/vehicles/fuel-specs/${id}`, { signal })
  const data = dataOf(body)
  return { spec: normalizeSpec(data.spec as Raw), impact: normalizeImpact(data.impact) }
}

const specOf = (body: unknown): FuelSpec => normalizeSpec(dataOf(body).spec as Raw)

export async function createFuelSpec(input: FuelSpecInput): Promise<FuelSpec> {
  const { data } = await api.post('/admin/vehicles/fuel-specs', input)
  return specOf(data)
}

export async function updateFuelSpec(id: number, input: FuelSpecInput): Promise<FuelSpec> {
  const { data } = await api.patch(`/admin/vehicles/fuel-specs/${id}`, input)
  return specOf(data)
}

export async function approveFuelSpec(id: number, input: { source: string | null; notes: string | null }): Promise<FuelSpec> {
  const { data } = await api.post(`/admin/vehicles/fuel-specs/${id}/approve`, input)
  return specOf(data)
}

export async function rejectFuelSpec(id: number, input: { notes: string | null } = { notes: null }): Promise<FuelSpec> {
  const { data } = await api.post(`/admin/vehicles/fuel-specs/${id}/reject`, input)
  return specOf(data)
}

export async function discardFuelSpecProposal(id: number): Promise<FuelSpec> {
  const { data } = await api.post(`/admin/vehicles/fuel-specs/${id}/discard-proposal`)
  return specOf(data)
}

export async function listUnlinkedVehicles(search: string, signal?: AbortSignal): Promise<{ groups: UnlinkedGroup[]; summary: FuelSpecSummary }> {
  const { data: body } = await api.get('/admin/vehicles/fuel-specs/unlinked', { params: search ? { search } : {}, signal })
  const data = dataOf(body)
  return { groups: Array.isArray(data.groups) ? (data.groups as Raw[]).map(normalizeGroup) : [], summary: normalizeSummary(data.summary) }
}

export async function linkFuelSpec(id: number, input: { make: string; model: string; respect_years: boolean }): Promise<{ linked: number; skipped_outside_years: number }> {
  const { data: body } = await api.post(`/admin/vehicles/fuel-specs/${id}/link`, input)
  const data = dataOf(body)
  return { linked: count(data.linked), skipped_outside_years: count(data.skipped_outside_years) }
}
