import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/lib/api/client', () => ({ api: { get: (...a: unknown[]) => get(...a) } }))

import { distanceOrNull, getOrgPerformanceStats } from '@/features/organizations/api'

describe('organization performance distances', () => {
  beforeEach(() => get.mockReset())

  it('keeps a missing distance null instead of 0', async () => {
    get.mockResolvedValue({ data: { data: {
      kpis: { total_trips: 3, distance_km: null, active_vehicles: 2, avg_device_uptime_pct: 99 },
      charts: { trip_activity: { labels: ['Mon', 'Tue'], datasets: [{ label: 'Trips', data: [1, 2] }, { label: 'Distance (km)', data: [null, 12.5] }] } },
      top_vehicles: [{ plate_number: 'ABC-123', make_model: 'Toyota', trip_count: 2, distance_km: null }],
    } } })
    const stats = await getOrgPerformanceStats('org-1')
    expect(stats.total_distance_km).toBeNull()
    expect(stats.trip_activity.map(d => d.distance_km)).toEqual([null, 12.5])
    expect(stats.top_vehicles[0]!.distance_km).toBeNull()
  })

  it('keeps a real zero and a real figure', async () => {
    get.mockResolvedValue({ data: { data: { kpis: { distance_km: 0 }, charts: {}, top_vehicles: [] } } })
    expect((await getOrgPerformanceStats('org-1')).total_distance_km).toBe(0)
    expect(distanceOrNull(1234.5)).toBe(1234.5)
    expect(distanceOrNull(undefined)).toBeNull()
    expect(distanceOrNull('12')).toBeNull()
    expect(distanceOrNull(Number.NaN)).toBeNull()
  })
})
