import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listDrivers } from '@/features/users/api'
import { getVehicle, listVehicles } from '@/features/vehicles/api'
import { getVehicleMapStatus } from '@/features/fleet-map/utils'
import { api } from '@/lib/api/client'

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn() } }))
describe('fleet investigation context', () => {
  beforeEach(() => vi.clearAllMocks())
  it('loads the compact map view in pages of 1000 and preserves offline GPS positions', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { vehicles: [{ id: '12', attributes: {
      registration_number: 'ABC-123', model: 'Truck', device_status: 'active', is_online: false,
      location: { latitude: 6.5, longitude: 3.4 }, speed: 25, last_packet_received_at: '2026-10-05T10:00:00Z',
    } }], pagination: { current: 1, lastPage: 2, perPage: 1000, total: 1200 } } } })
    const result = await listVehicles({ view: 'map', has_device: true, page: 1, per_page: 1000 })
    expect(api.get).toHaveBeenCalledWith('/admin/vehicles', { params: { view: 'map', has_device: true, page: 1, per_page: 1000 } })
    expect(result.data[0].current_location).toMatchObject({ latitude: 6.5, longitude: 3.4, speed: 25 })
    expect(getVehicleMapStatus(result.data[0])).toBe('offline')
    expect(result.meta).toMatchObject({ last_page: 2, per_page: 1000, total: 1200 })
  })
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
