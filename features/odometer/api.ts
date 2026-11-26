import { z } from 'zod'
import { api } from '@/lib/api/client'

/**
 * Odometer reviews and installer readings (docs/odometer/API_CONTRACT.md, sections 3 and 5).
 * Distances are kilometres, and missing is null: nothing here turns a missing figure
 * into 0.
 */

const id = z.union([z.string(), z.number()])
/** Null for missing, null-safe: never 0. */
const km = z.number().finite().nullish().transform(value => value ?? null)
const text = z.string().nullish().transform(value => value ?? null)

const actor = z.object({ type: z.string().nullish(), id: id.nullish(), name: text }).nullish()

export const reviewSchema = z.object({
  id,
  vehicle: z.object({ id: id.nullish(), registration_number: text }).nullish(),
  reading: z.object({
    id: id.nullish(), value_km: km, original_value: km, original_unit: text, effective_at: text,
  }).nullish(),
  level: z.string(),
  reason: z.string(),
  status: z.string(),
  overdue: z.boolean().nullish().transform(value => value === true),
  previous_accepted_km: km,
  proposed_km: km,
  responsible: z.object({ type: text, id: id.nullish(), name: text }).nullish(),
  requires_photo: z.boolean().nullish().transform(value => value === true),
  has_photo: z.boolean().nullish().transform(value => value === true),
  approvals_required: z.number().int().positive().nullish().transform(value => value ?? 1),
  approvals: z.array(z.object({
    by: actor, decision: z.string(), reason: text, at: text,
  })).nullish().transform(value => value ?? []),
  created_at: text,
  resolved_at: text,
  history: z.array(z.object({
    at: text, event: z.string(), by: actor, detail: text,
  })).nullish().transform(value => value ?? []),
  // Not in the contract: the evidence the photo download needs. Used if the API adds it.
  evidence: z.array(z.object({ id, kind: text })).nullish().transform(value => value ?? []),
})
export type OdometerReview = z.infer<typeof reviewSchema>

const pagination = z.object({ current: z.number(), lastPage: z.number(), total: z.number(), perPage: z.number() })
const listSchema = z.object({ reviews: z.array(reviewSchema), pagination })

export type ReviewStatusFilter = 'pending' | 'overdue' | 'approved' | 'rejected'

export async function listOdometerReviews(
  params: { status?: ReviewStatusFilter; level?: string; page: number },
  signal?: AbortSignal,
) {
  const { data } = await api.get('/admin/odometer-reviews', { params, signal })
  return listSchema.parse(data.data)
}

export async function getOdometerReview(reviewId: string | number, signal?: AbortSignal) {
  const { data } = await api.get(`/admin/odometer-reviews/${reviewId}`, { signal })
  return reviewSchema.parse(data.data?.review ?? data.data)
}

export async function decideOdometerReview(
  reviewId: string | number, decision: 'approve' | 'reject', reason: string,
) {
  const { data } = await api.post(`/admin/odometer-reviews/${reviewId}/${decision}`, { reason })
  return reviewSchema.parse(data.data?.review ?? data.data)
}

export async function assignOdometerReview(reviewId: string | number, adminId: string | number) {
  const { data } = await api.post(`/admin/odometer-reviews/${reviewId}/assign`, { admin_id: adminId })
  return reviewSchema.parse(data.data?.review ?? data.data)
}

/** The file is private and every download is logged, so it is fetched with the session, never linked. */
export async function fetchEvidence(evidenceId: string | number): Promise<Blob> {
  const { data } = await api.get(`/odometer-evidence/${evidenceId}/download`, { responseType: 'blob' })
  return data as Blob
}

// ─── Installer readings ───────────────────────────────────────────────────────

export type ReadingUnit = 'km' | 'mi'
export const SKIP_REASONS = ['locked_vehicle', 'dashboard_unreadable', 'no_odometer_display', 'other'] as const
export type SkipReason = (typeof SKIP_REASONS)[number]

export const readingResultSchema = z.object({
  outcome: z.enum(['accepted', 'pending_sync', 'pending_review', 'rejected']),
}).loose()
export type ReadingResult = z.infer<typeof readingResultSchema>

const installerPath = (orgId: string | number, vehicleId: string | number) =>
  `/installer/organizations/${orgId}/vehicles/${vehicleId}`

export async function submitInstallerReading(
  orgId: string | number, vehicleId: string | number,
  body: { value: number; unit: ReadingUnit; physically_inspected: boolean; note?: string },
): Promise<ReadingResult> {
  const { data } = await api.post(`${installerPath(orgId, vehicleId)}/odometer-readings`, { ...body, kind: 'reading' })
  return readingResultSchema.parse(data.data)
}

export async function skipInstallerReading(
  orgId: string | number, vehicleId: string | number, body: { reason: SkipReason; note?: string | null },
) {
  await api.post(`${installerPath(orgId, vehicleId)}/odometer-skip`, { reason: body.reason, note: body.note ?? null })
}
