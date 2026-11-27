import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AdminUser } from '@/types/api'

vi.mock('@/lib/api/client', () => ({ api: {} }))
const decide = vi.fn()
const assign = vi.fn()
const getReview = vi.fn()
const attach = vi.fn()
const fetchEvidence = vi.fn()
vi.mock('@/features/odometer/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/odometer/api')>()),
  getOdometerReview: (...a: unknown[]) => getReview(...a),
  decideOdometerReview: (...a: unknown[]) => decide(...a),
  assignOdometerReview: (...a: unknown[]) => assign(...a),
  fetchEvidence: (...a: unknown[]) => fetchEvidence(...a),
  attachReviewEvidence: (...a: unknown[]) => attach(...a),
  listOdometerReviewers: vi.fn().mockResolvedValue([{ id: 9, name: 'N. Reviewer', email: 'n@x.test' }]),
}))

import { reviewSchema } from '@/features/odometer/api'
import { ReviewDetail } from '@/features/odometer/components/ReviewDetail'
import { useAuthStore } from '@/stores/auth.store'

const raw = (over: Record<string, unknown> = {}) => ({
  id: 5, vehicle: { id: 7, registration_number: 'ABC-123' },
  reading: { id: 41, value_km: 83900, original_value: 83900, original_unit: 'km', effective_at: '2026-11-27T08:50:00Z' },
  level: 'support', reason: 'suspected_tampering', status: 'pending', overdue: false,
  previous_accepted_km: 84000, proposed_km: 83900, responsible: { type: 'support_queue', id: null, name: 'Support queue' },
  requires_photo: false, has_photo: true, approvals_required: 2, approvals: [],
  created_at: '2026-11-27T09:00:00Z', resolved_at: null,
  history: [{ at: '2026-11-27T09:00:00Z', event: 'created', by: null, detail: 'Decrease flagged' }], ...over,
})
const user = (id: number, permissions: string[], role = 'support'): AdminUser =>
  ({ id, name: 'U', email: 'u@x.test', avatar: null, last_login: null, role, permissions })

function show(over: Record<string, unknown> = {}) {
  const review = reviewSchema.parse(raw(over))
  getReview.mockResolvedValue(review)
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ReviewDetail reviewId={5} initial={review} />
    </QueryClientProvider>,
  )
}

describe('review detail', () => {
  beforeEach(() => { vi.clearAllMocks(); useAuthStore.setState({ token: 't', user: null, isBootstrapping: false }) })

  it('is read-only for an admin without the reviewer permission, even a super admin', () => {
    useAuthStore.setState({ user: user(1, [], 'super_admin') })
    show()
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull()
    expect(screen.getByTestId('read-only-note')).toHaveTextContent(/odometer reviewer permission/)
    // History and the figures are still there to read.
    expect(screen.getByText('Decrease flagged')).toBeInTheDocument()
    expect(screen.getByText('83,900 km')).toBeInTheDocument()
  })

  it('shows the second-approval requirement after a first approval', () => {
    useAuthStore.setState({ user: user(4, ['odometer_reviewer']) })
    show({ approvals: [{ by: { type: 'admin', id: 3, name: 'S. Reviewer' }, decision: 'approved', reason: 'photo matches', at: null }] })
    expect(screen.getByTestId('approval-progress')).toHaveTextContent('1 of 2 approvals. Waiting for a second, different reviewer.')
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
  })

  it('does not offer the first approver a second approval', () => {
    useAuthStore.setState({ user: user(3, ['odometer_reviewer']) })
    show({ approvals: [{ by: { type: 'admin', id: 3, name: 'S. Reviewer' }, decision: 'approved', reason: 'ok', at: null }] })
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.getByTestId('read-only-note')).toHaveTextContent(/already approved/)
  })

  it('needs a reason, then sends the decision', async () => {
    const person = userEvent.setup()
    useAuthStore.setState({ user: user(4, ['odometer_reviewer']) })
    decide.mockResolvedValue(reviewSchema.parse(raw({ approvals: [{ by: { type: 'admin', id: 4, name: 'U' }, decision: 'approved', reason: 'photo matches', at: null }] })))
    show()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()
    await person.type(screen.getByLabelText('Reason (required)'), 'photo matches')
    await person.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(decide).toHaveBeenCalledWith(5, 'approve', 'photo matches'))
    // The review stays pending after the first of two approvals.
    await waitFor(() => expect(screen.getByTestId('approval-progress')).toHaveTextContent('1 of 2'))
  })

  it('does not rely on hiding: a 403 from the API is shown', async () => {
    const person = userEvent.setup()
    useAuthStore.setState({ user: user(4, ['odometer_reviewer']) })
    decide.mockRejectedValue({ response: { status: 403, data: { message: 'You cannot approve your own submission' } } })
    show()
    await person.type(screen.getByLabelText('Reason (required)'), 'x')
    await person.click(screen.getByRole('button', { name: 'Reject' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You cannot approve your own submission')
  })

  it('assigns the review to an admin', async () => {
    const person = userEvent.setup()
    useAuthStore.setState({ user: user(4, ['odometer_reviewer']) })
    assign.mockResolvedValue(reviewSchema.parse(raw()))
    show()
    await screen.findByRole('option', { name: 'N. Reviewer' })
    await person.selectOptions(screen.getByLabelText('Assign to'), '9')
    await person.click(screen.getByRole('button', { name: 'Assign' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith(5, '9'))
  })

  it('lets a reviewer attach a photo to a review that needs one, then approve', async () => {
    const person = userEvent.setup()
    useAuthStore.setState({ user: user(4, ['odometer_reviewer']) })
    attach.mockResolvedValue(undefined)
    decide.mockRejectedValueOnce({ response: { status: 422, data: { code: 'photo_required', message: 'photo' } } })
    show({ requires_photo: true, has_photo: false, approvals_required: 1 })
    expect(screen.getByText(/photo is required before this can be approved/)).toBeInTheDocument()
    const file = new File(['x'], 'dash.jpg', { type: 'image/jpeg' })
    await person.upload(screen.getByLabelText('Attach a dashboard photo'), file)
    await waitFor(() => expect(attach).toHaveBeenCalledWith(5, file))
    // The review is read again so it shows the photo.
    await waitFor(() => expect(getReview).toHaveBeenCalled())
    await person.type(screen.getByLabelText('Reason (required)'), 'ok')
    await person.click(screen.getByRole('button', { name: 'Approve' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/photo is required first/i)
  })

  it('does not offer to attach a photo without the permission', () => {
    useAuthStore.setState({ user: user(1, [], 'super_admin') })
    show({ requires_photo: true, has_photo: false })
    expect(screen.queryByLabelText('Attach a dashboard photo')).toBeNull()
  })

  it('opens evidence through the authenticated download, never a link', async () => {
    const person = userEvent.setup()
    useAuthStore.setState({ user: user(4, ['odometer_reviewer']) })
    fetchEvidence.mockResolvedValue(new Blob(['x']))
    const open = vi.fn()
    vi.stubGlobal('open', open)
    URL.createObjectURL = vi.fn(() => 'blob:abc')
    show({ has_photo: true, evidence: [{ id: 12, kind: 'dashboard_photo', mime: 'image/jpeg', created_at: null }] })
    expect(screen.queryByRole('link')).toBeNull()
    await person.click(screen.getByRole('button', { name: /View dashboard photo/ }))
    await waitFor(() => expect(fetchEvidence).toHaveBeenCalledWith(12))
    expect(open).toHaveBeenCalledWith('blob:abc', '_blank', 'noopener')
  })
})
