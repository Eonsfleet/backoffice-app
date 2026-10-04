import { describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { getSubscriptionSummary } from '@/features/subscriptions/api'

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn() } }))

describe('subscription summary response', () => {
  it('reads counts from data and preserves zero cancelled subscriptions', async () => {
    const counts = { total: 21, active: 21, inactive: 0, cancelled: 0 }
    vi.mocked(api.get).mockResolvedValue({ data: { message: 'success', data: counts, status: 200, meta: { request_id: 'example' } } })
    expect(await getSubscriptionSummary()).toEqual(counts)
    expect(api.get).toHaveBeenCalledWith('/admins/subscriptions/analytics/summary')
  })

  it('rejects a success message without valid counts', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { message: 'success', data: null } })
    await expect(getSubscriptionSummary()).rejects.toThrow('Unexpected response shape')
  })
})
