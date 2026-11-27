import { describe, expect, it, vi } from 'vitest'
import { canAccessNavigation, getRouteItem } from '@/lib/navigation'

vi.mock('@/lib/api/client', () => ({ api: {} }))
import type { AdminUser } from '@/types/api'
import { readingResultSchema, reviewSchema, syncSchema } from '@/features/odometer/api'
import {
  approvalProgress, canReviewOdometer, describeSync, errorCode, errorText, readingOutcomeText, formatKm, parseReading, reviewAction,
} from '@/features/odometer/lib'

const navAccess = (user: AdminUser | null) => canAccessNavigation(user, getRouteItem('/odometer-reviews')!)

const admin = (role: string, permissions?: string[], id: string | number = 1): AdminUser =>
  ({ id, name: 'A', email: 'a@x.test', avatar: null, last_login: null, role, permissions })

const raw = (over: Record<string, unknown> = {}) => ({
  id: 5, vehicle: { id: 7, registration_number: 'ABC-123' },
  reading: { id: 41, value_km: 83900, original_value: 83900, original_unit: 'km', effective_at: '2026-11-27T08:50:00Z' },
  level: 'support', reason: 'suspected_tampering', status: 'pending', overdue: false,
  previous_accepted_km: 84000, proposed_km: 83900,
  responsible: { type: 'support_queue', id: null, name: 'Support queue' },
  requires_photo: true, has_photo: false, approvals_required: 2, approvals: [],
  created_at: '2026-11-27T09:00:00Z', resolved_at: null, history: [], ...over,
})
const review = (over: Record<string, unknown> = {}) => reviewSchema.parse(raw(over))

describe('odometer_reviewer permission', () => {
  it('is not inherited by super admins', () => {
    expect(canReviewOdometer(admin('super_admin'))).toBe(false)
    expect(canReviewOdometer(admin('super_admin', ['admin.devices.view']))).toBe(false)
  })
  it('is granted only by the permission itself', () => {
    expect(canReviewOdometer(admin('support', ['odometer_reviewer']))).toBe(true)
    expect(canReviewOdometer(admin('support'))).toBe(false)
    expect(canReviewOdometer(admin('installer'))).toBe(false)
    expect(canReviewOdometer(null)).toBe(false)
  })
  it('lets any signed-in admin open the review list', () => {
    expect(navAccess(admin('support'))).toBe(true)
    expect(navAccess(admin('installer'))).toBe(true)
    expect(navAccess(null)).toBe(false)
  })
})

describe('what an admin may do with a review', () => {
  const reviewer = admin('support', ['odometer_reviewer'], 3)
  it('is read-only without the permission', () => {
    expect(reviewAction(review(), admin('super_admin'))).toEqual({ allowed: false, reason: 'read_only' })
  })
  it('allows a reviewer to decide a pending review', () => {
    expect(reviewAction(review(), reviewer)).toEqual({ allowed: true })
  })
  it('does not offer a decision on a resolved review', () => {
    expect(reviewAction(review({ status: 'approved' }), reviewer)).toEqual({ allowed: false, reason: 'resolved' })
  })
  it('does not offer a second approval to the same reviewer', () => {
    const first = { by: { type: 'admin', id: 3, name: 'S. Reviewer' }, decision: 'approved', reason: 'ok', at: '2026-11-27T10:00:00Z' }
    expect(reviewAction(review({ approvals: [first] }), reviewer)).toEqual({ allowed: false, reason: 'already_approved' })
    expect(reviewAction(review({ approvals: [first] }), admin('support', ['odometer_reviewer'], 4))).toEqual({ allowed: true })
  })
})

describe('two-approver display', () => {
  const first = { by: { type: 'admin', id: 3, name: 'S. Reviewer' }, decision: 'approved', reason: 'ok', at: null }
  it('says the review still needs a second, different reviewer', () => {
    const r = review({ approvals: [first] })
    expect(r.status).toBe('pending')
    expect(approvalProgress(r)).toBe('1 of 2 approvals. Waiting for a second, different reviewer.')
  })
  it('says nothing for a one-approval review', () => {
    expect(approvalProgress(review({ approvals_required: 1 }))).toBeNull()
  })
  it('reports completion once both have approved', () => {
    const r = review({ status: 'approved', approvals: [first, { ...first, by: { type: 'admin', id: 4, name: 'T' } }] })
    expect(approvalProgress(r)).toBe('2 of 2 approvals')
  })
})

describe('null safety', () => {
  it('keeps a missing figure null and shows it as unavailable, never 0', () => {
    const r = review({ previous_accepted_km: null, proposed_km: null, reading: { id: 1, value_km: null, original_value: null, original_unit: null, effective_at: null } })
    expect(r.previous_accepted_km).toBeNull()
    expect(r.proposed_km).toBeNull()
    expect(r.reading?.value_km).toBeNull()
    expect(formatKm(r.previous_accepted_km)).toBe('Unavailable')
    expect(formatKm(undefined)).toBe('Unavailable')
    expect(formatKm(0)).toBe('0 km')
    expect(formatKm(84231.55)).toBe('84,231.6 km')
  })
  it('defaults the lists and approval count', () => {
    const r = reviewSchema.parse({ id: 1, level: 'organisation', reason: 'decrease', status: 'pending' })
    expect(r.approvals).toEqual([])
    expect(r.history).toEqual([])
    expect(r.approvals_required).toBe(1)
    expect(r.overdue).toBe(false)
  })
})

describe('installer reading entry', () => {
  const form = (over = {}) => ({ value: '', unit: 'km' as const, inspected: false, note: '', zeroConfirmed: false, ...over })
  it('is empty when nothing was typed', () => { expect(parseReading(form())).toBeNull() })
  it('parses a reading with the inspection flag', () => {
    expect(parseReading(form({ value: '52,340', unit: 'mi', inspected: true, note: ' ok ' }))).toEqual({ value: 52340, unit: 'mi', physically_inspected: true, note: 'ok' })
  })
  it('rejects non-numbers, negatives and absurd values', () => {
    expect(parseReading(form({ value: 'abc' }))).toEqual({ error: expect.stringMatching(/number/) })
    expect(parseReading(form({ value: '-1' }))).toEqual({ error: expect.stringMatching(/number/) })
    expect(parseReading(form({ value: '9999999' }))).toEqual({ error: expect.stringMatching(/too large/) })
  })
  it('accepts 0 only when confirmed', () => {
    expect(parseReading(form({ value: '0' }))).toEqual({ error: expect.stringMatching(/Confirm/) })
    expect(parseReading(form({ value: '0', zeroConfirmed: true }))).toMatchObject({ value: 0 })
  })
})

describe('error codes', () => {
  const failure = (code: string) => ({ response: { status: 422, data: { code, message: 'server text' } } })
  it('words the stable codes for people', () => {
    expect(errorText(failure('photo_required'), 'x')).toMatch(/photo is required/)
    expect(errorText(failure('own_submission'), 'x')).toMatch(/submitted yourself/)
    expect(errorText(failure('same_reviewer'), 'x')).toMatch(/different reviewer/)
    expect(errorText(failure('review_closed'), 'x')).toMatch(/already been decided/)
    expect(errorText(failure('something_new'), 'x')).toBe('server text')
    expect(errorCode(failure('photo_required'))).toBe('photo_required')
    expect(errorCode(new Error('x'))).toBeNull()
  })
})

describe('errors', () => {
  it('uses the server message, with a fallback', () => {
    expect(errorText({ response: { status: 403, data: { message: 'You cannot approve your own submission' } } }, 'x')).toBe('You cannot approve your own submission')
    expect(errorText({ response: { status: 403 } }, 'x')).toMatch(/not allowed/)
    expect(errorText(new Error('boom'), 'fallback')).toBe('fallback')
  })
})

describe('sync state', () => {
  const sync = (over: Record<string, unknown> = {}) => syncSchema.parse({ attempts: 1, blocked: false, blocked_reason: null, message: null, ...over })

  it('shows a switched-off feature as a calm saved state, not a failure', () => {
    const view = describeSync(sync({ blocked: true, blocked_reason: 'engine_feature_disabled', message: 'Not switched on for Acme.' }), 'pending_sync')!
    expect(view.tone).toBe('calm')
    expect(view.label).toBe('Not switched on yet')
    expect(view.message).toBe('Not switched on for Acme.')
  })
  it('shows an unavailable platform as retrying automatically', () => {
    const view = describeSync(sync({ blocked: true, blocked_reason: 'engine_unavailable' }), 'pending_sync')!
    expect(view.tone).toBe('info')
    expect(view.label).toBe('Retrying automatically')
  })
  it('shows an unblocked pending reading as simply pending', () => {
    expect(describeSync(sync(), 'pending_sync')?.tone).toBe('pending')
  })
  it('shows nothing once the reading is no longer pending, or without sync', () => {
    expect(describeSync(sync({ blocked: true, blocked_reason: 'engine_unavailable' }), 'accepted')).toBeNull()
    expect(describeSync(null, 'pending_sync')).toBeNull()
    expect(describeSync(syncSchema.parse(undefined))).toBeNull()
  })
  it('wording works for a vehicle block (no reading status)', () => {
    expect(describeSync(syncSchema.parse({ pending: 2, blocked: true, blocked_reason: 'engine_feature_disabled', message: null }))?.label).toBe('Not switched on yet')
    expect(describeSync(syncSchema.parse({ pending: 0, blocked: false }))).toBeNull()
  })
  it('is null-safe: an older backend with no sync parses and behaves as before', () => {
    const r = reviewSchema.parse(raw())
    expect(r.reading?.sync).toBeNull()
    expect(describeSync(r.reading?.sync ?? null, r.reading?.status)).toBeNull()
    const result = readingResultSchema.parse({ outcome: 'pending_sync' })
    expect(readingOutcomeText(result)).toBe('Reading saved. It takes effect once the tracking system confirms it.')
  })
  it('tells the installer a blocked reading is saved, without suggesting a retry', () => {
    const text = readingOutcomeText(readingResultSchema.parse({ outcome: 'pending_sync', reading: { status: 'pending_sync', sync: { attempts: 0, blocked: true, blocked_reason: 'engine_feature_disabled', message: 'Not switched on yet for this organization.' } } }))
    expect(text).toContain('Not switched on yet for this organization.')
    expect(text).toMatch(/Nothing more is needed/)
    expect(text).not.toMatch(/retry|try again/i)
  })
})
