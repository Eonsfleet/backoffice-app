import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDashboardMetrics, getDashboardDevices } from '@/features/dashboard/api'
import { api } from '@/lib/api/client'

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn() } }))

describe('dashboard metric normalization', () => {
  beforeEach(() => vi.clearAllMocks())
  it('preserves missing metrics as unknown and a real zero as zero', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { total_organization: { count: 0 }, total_vehicle: { count: 23 } } } })
    const metrics = await getDashboardMetrics()
    expect(metrics.total_organizations).toBe(0)
    expect(metrics.total_vehicles).toBe(23)
    expect(metrics.total_devices).toBeUndefined()
    expect(metrics.active_subscriptions).toBeUndefined()
  })
  it('does not replace zero unassigned devices with disconnected devices', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { online: { total: 4 }, offline: 2, unassigned: 0, disconnected: 7 } } })
    expect(await getDashboardDevices()).toEqual({ online: 4, offline: 2, unassigned: 0 })
  })
  it('rejects invalid counts without inventing a healthy zero', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { online: -1, offline: 'unknown' } } })
    expect(await getDashboardDevices()).toEqual({ online: undefined, offline: undefined, unassigned: undefined })
  })
  it('does not label vehicles without devices as unassigned hardware', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { online: 4, offline: 2, disconnected: { total: 7 } } } })
    expect((await getDashboardDevices()).unassigned).toBeUndefined()
  })
})
