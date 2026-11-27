import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn(); const post = vi.fn()
vi.mock('@/lib/api/client', () => ({ api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }))

import {
  attachReviewEvidence, fetchEvidence, listOdometerReviewers, uploadInstallerEvidence,
} from '@/features/odometer/api'

describe('odometer API calls', () => {
  beforeEach(() => { get.mockReset(); post.mockReset() })

  it('opens evidence through the admin download as a blob', async () => {
    get.mockResolvedValue({ data: new Blob(['x']) })
    await fetchEvidence(12)
    expect(get).toHaveBeenCalledWith('/admin/odometer-evidence/12/download', { responseType: 'blob' })
  })

  it('attaches a review photo as multipart under the review', async () => {
    post.mockResolvedValue({ data: {} })
    const file = new File(['x'], 'd.jpg', { type: 'image/jpeg' })
    await attachReviewEvidence(5, file)
    const [url, body] = post.mock.calls[0]!
    expect(url).toBe('/admin/odometer-reviews/5/evidence')
    expect((body as FormData).get('file')).toBe(file)
  })

  it('lists reviewers from the reviewers endpoint', async () => {
    get.mockResolvedValue({ data: { data: { reviewers: [{ id: 3, name: 'S', email: 's@x.test' }] } } })
    expect(await listOdometerReviewers()).toEqual([{ id: 3, name: 'S', email: 's@x.test' }])
    expect(get.mock.calls[0]![0]).toBe('/admin/odometer-reviewers')
  })

  it('uploads installer evidence and returns its id', async () => {
    post.mockResolvedValue({ data: { data: { evidence: { id: 33, kind: 'dashboard_photo' } } } })
    const id = await uploadInstallerEvidence('org-1', 7, new File(['x'], 'd.jpg'))
    expect(id).toBe(33)
    expect(post.mock.calls[0]![0]).toBe('/installer/organizations/org-1/vehicles/7/odometer-evidence')
  })
})
