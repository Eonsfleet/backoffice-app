import { describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { bulkDeleteUsers, listDeletedUsers, permanentlyDeleteUsers, restoreDeletedUsers } from '@/features/users/api'
import { bulkDeleteVehicles } from '@/features/vehicles/api'
import { bulkDeleteDevices } from '@/features/devices/api'

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

describe('bulk resource API contracts', () => {
  it('sends selected ids in DELETE bodies for all three live resource types', async () => {
    const ids = [1, 'uuid-example']
    await bulkDeleteUsers(ids); await bulkDeleteVehicles(ids); await bulkDeleteDevices(ids)
    for (const resource of ['users', 'vehicles', 'devices']) expect(api.delete).toHaveBeenCalledWith(`/admin/${resource}/bulk`, { data: { ids } })
  })
  it('restores or permanently deletes through distinct deleted-user endpoints', async () => {
    await restoreDeletedUsers([3]); await permanentlyDeleteUsers([3])
    expect(api.post).toHaveBeenCalledWith('/admin/users/deleted/restore', { ids: [3] })
    expect(api.delete).toHaveBeenCalledWith('/admin/users/deleted/bulk', { data: { ids: [3] } })
  })
  it('reads the deleted timestamp and pagination from the deleted-user feed', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { users: [{ id: 3, attributes: { full_name: 'Deleted User', email: 'deleted@example.test', deleted_at: '2026-10-04T10:00:00Z' } }], pagination: { current: 2, lastPage: 3, perPage: 15, total: 32 } } } })
    const result = await listDeletedUsers({ page: 2, q: 'deleted' })
    expect(api.get).toHaveBeenCalledWith('/admin/users/deleted', { params: { page: 2, q: 'deleted' } })
    expect(result.data[0].deleted_at).toBe('2026-10-04T10:00:00Z')
    expect(result.meta).toEqual({ current_page: 2, last_page: 3, per_page: 15, total: 32 })
  })
})
