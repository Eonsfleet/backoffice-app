import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPlatformHealth, listInstallers, resetNotificationTemplate } from '@/features/platform/api'
import { api } from '@/lib/api/client'

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
describe('verified platform contracts', () => {
  beforeEach(() => vi.clearAllMocks())
  it('accepts unhealthy readiness snapshots and strips infrastructure diagnostics', async () => {
    vi.mocked(api.get).mockResolvedValue({ status: 503, data: { status: 'unhealthy', timestamp: '2026-10-03T07:00:00Z', services: { database: { status: 'down', message: 'Private server diagnostic', latency_ms: 0 } }, application: { debug: true } } })
    const result = await getPlatformHealth()
    expect(result.status).toBe('unhealthy')
    expect(result.services.database).toEqual({ status: 'down', latency_ms: 0 })
    expect(result).not.toHaveProperty('application')
    const options = vi.mocked(api.get).mock.calls[0][1]!
    expect(options.validateStatus!(503)).toBe(true)
    expect(options.validateStatus!(401)).toBe(false)
  })
  it('rejects malformed health responses instead of reporting healthy zeroes', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { status: 'healthy', services: {} } })
    await expect(getPlatformHealth()).rejects.toThrow()
  })
  it('retains unloaded installer relationships as unavailable, not empty assignments', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { installers: [{ id: 12, attributes: {}, relationships: {} }], pagination: { current: 1, lastPage: 1, total: 1, perPage: 20 } } } })
    const result = await listInstallers({ page: 1, perPage: 20 })
    expect(result.installers[0].relationships?.organizations).toBeUndefined()
    expect(api.get).toHaveBeenCalledWith('/admin/admins/installers', expect.objectContaining({ params: { page: 1, perPage: 20 } }))
  })
  it('uses the catalogue-reset command, without sending fabricated default wording', async () => {
    await resetNotificationTemplate(12)
    expect(api.post).toHaveBeenCalledWith('/admin/notification-templates/12/reset')
  })
})
