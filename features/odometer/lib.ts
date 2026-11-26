import type { AdminUser } from '@/types/api'
import type { OdometerReview, ReadingResult } from './api'

export const REVIEWER_PERMISSION = 'odometer_reviewer'

/**
 * Deciding needs the `odometer_reviewer` permission itself. Unlike every other check
 * in the app there is no super-admin bypass (spec section 5), so this reads the
 * permission list only. It only decides what to show: the API still answers 403.
 */
export function canReviewOdometer(user: AdminUser | null | undefined): boolean {
  return user?.permissions?.includes(REVIEWER_PERMISSION) === true
}

const REASONS: Record<string, string> = {
  decrease: 'Decrease',
  decrease_above_threshold: 'Decrease above threshold',
  discrepancy: 'Discrepancy',
  implausible_jump: 'Implausible jump',
  probable_rollover: 'Probable rollover',
  dashboard_replacement: 'Dashboard replacement',
  reset: 'Reset',
  suspected_tampering: 'Suspected tampering',
  unusable_timestamps: 'Unusable timestamps',
  legacy_client_value: 'Legacy client value',
  disputed_baseline: 'Disputed baseline',
}
export const reasonLabel = (reason: string) => REASONS[reason] ?? reason.replace(/_/g, ' ')

const sameActor = (a: { type?: string | null; id?: string | number | null } | null | undefined, user: AdminUser) =>
  !!a && a.id != null && String(a.id) === String(user.id) && (a.type == null || a.type === 'admin')

export type ReviewAction =
  | { allowed: true }
  | { allowed: false; reason: 'read_only' | 'resolved' | 'already_approved' }

/** What the current admin may do now. Hidden controls are a convenience; the server enforces the rest. */
export function reviewAction(review: OdometerReview, user: AdminUser | null | undefined): ReviewAction {
  if (!canReviewOdometer(user)) return { allowed: false, reason: 'read_only' }
  if (review.status !== 'pending') return { allowed: false, reason: 'resolved' }
  if (user && review.approvals.some(a => a.decision === 'approved' && sameActor(a.by, user)))
    return { allowed: false, reason: 'already_approved' }
  return { allowed: true }
}

/** "1 of 2 approvals" for a review that needs more than one; null when one decision settles it. */
export function approvalProgress(review: OdometerReview): string | null {
  if (review.approvals_required <= 1) return null
  const given = review.approvals.filter(a => a.decision === 'approved').length
  const remaining = Math.max(review.approvals_required - given, 0)
  const base = `${Math.min(given, review.approvals_required)} of ${review.approvals_required} approvals`
  return review.status === 'pending' && remaining > 0
    ? `${base}. Waiting for ${remaining === 1 ? 'a second, different reviewer' : `${remaining} more different reviewers`}.`
    : base
}

export function formatKm(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'Unavailable'
  return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(value)} km`
}

/** The reading as the submitter entered it, when that was not kilometres. */
export function originalReading(review: OdometerReview): string | null {
  const r = review.reading
  if (!r || r.original_value == null || !r.original_unit || r.original_unit === 'km') return null
  return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(r.original_value)} ${r.original_unit}`
}

export function errorText(error: unknown, fallback: string): string {
  const response = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response
  if (response?.status === 403) return response.data?.message ?? 'You are not allowed to decide this review.'
  return response?.data?.message ?? fallback
}

export function readingOutcomeText(result: ReadingResult): string {
  switch (result.outcome) {
    case 'accepted': return 'Reading accepted.'
    case 'pending_sync': return 'Reading saved. It takes effect once the tracking system confirms it.'
    case 'pending_review': return 'Reading saved and sent for review. The odometer is unchanged until it is approved.'
    case 'rejected': return 'Reading was rejected.'
  }
}

export type ReadingForm = { value: string; unit: 'km' | 'mi'; inspected: boolean; note: string; zeroConfirmed: boolean }

/** Null when nothing was entered, so an empty prompt is a skip, never a reading of 0. */
export type ParsedReading = { value: number; unit: 'km' | 'mi'; physically_inspected: boolean; note?: string }

export function parseReading(form: ReadingForm): ParsedReading | { error: string } | null {
  const text = form.value.trim().replace(/,/g, '')
  if (!text) return null
  const value = Number(text)
  if (!Number.isFinite(value) || value < 0) return { error: 'Enter the reading as a number, 0 or more.' }
  if (value === 0 && !form.zeroConfirmed) return { error: 'Confirm that the dashboard really reads 0, or enter the reading.' }
  const km = form.unit === 'mi' ? value * 1.609344 : value
  if (km > 5_000_000) return { error: 'That reading is too large to be an odometer.' }
  const note = form.note.trim()
  return { value, unit: form.unit, physically_inspected: form.inspected, ...(note ? { note } : {}) }
}
