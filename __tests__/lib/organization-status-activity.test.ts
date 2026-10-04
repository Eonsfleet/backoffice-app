import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { getOrgActivityLog, getOrganization, setOrganizationStatus } from '@/features/organizations/api'

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn(), patch: vi.fn() } }))

describe('organization account status and activity contracts', () => {
  beforeEach(() => vi.clearAllMocks())
  it('preserves an unset account status even when the subscription is active', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { id: '42', attributes: { name: 'Fleet', status: null }, relationships: { current_plan: { status: 'active' } } } } })
    const org = await getOrganization('42')
    expect(org.status).toBeNull()
    expect(org.current_plan?.status).toBe('active')
  })
  it('updates status through the admin-only status endpoint', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { data: { id: '42', attributes: { name: 'Fleet', status: 'active' } } } })
    expect((await setOrganizationStatus('42', 'active')).status).toBe('active')
    expect(api.patch).toHaveBeenCalledWith('/admin/organizations/42/status', { status: 'active' })
  })
  it('fetches organization activity without an admin causer filter', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [], meta: { total: 0, per_page: 25, current_page: 1, last_page: 1 } } })
    await getOrgActivityLog('42', { page: 1, per_page: 25 })
    expect(api.get).toHaveBeenCalledWith('/admin/organizations/42/activity-log', { params: { page: 1, per_page: 25 } })
  })
  it('propagates a failed activity request instead of reporting an empty feed', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Activity unavailable'))
    await expect(getOrgActivityLog('42')).rejects.toThrow('Activity unavailable')
  })
})
