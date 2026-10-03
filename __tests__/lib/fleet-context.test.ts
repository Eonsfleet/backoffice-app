import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listDrivers } from '@/features/users/api'
import { getVehicle } from '@/features/vehicles/api'
import { api } from '@/lib/api/client'

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn() } }))
describe('fleet investigation context', () => {
  beforeEach(() => vi.clearAllMocks())
  it('does not invent an active driver state when the server omits it', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { users: [{ id: '10', attributes: { full_name: 'Driver' }, relationships: {} }], pagination: { current: 1, lastPage: 1, perPage: 20, total: 1 } } } })
    const drivers = await listDrivers({ page: 1, per_page: 20 })
    expect(drivers.data[0].status).toBe('unknown')
    expect(drivers.data[0].organization).toBeNull()
    expect(api.get).toHaveBeenCalledWith('/admin/users/role/driver', expect.objectContaining({ params: { page: 1, per_page: 20 } }))
  })
  it('keeps absent vehicle status and location explicit', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { id: '10', attributes: { registration_number: 'LAG-123-AB' }, relationships: {} } } })
    const vehicle = await getVehicle('10')
    expect(vehicle.status).toBe('unknown')
    expect(vehicle.current_location).toBeNull()
    expect(vehicle.device_status).toBeNull()
  })
})
