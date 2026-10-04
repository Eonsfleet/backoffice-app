import { describe, expect, it } from 'vitest'
import type { DeviceHealth, FleetHealth, GrowthAnalytics } from '@/features/analytics/api'
import {
  buildFindings,
  buildReportCsv,
  computeRates,
  formatPeriodLabel,
  mergeGrowthSeries,
  percent,
  readinessScore,
  readinessSeverity,
} from '@/features/analytics/report'

const fleet: FleetHealth = {
  summary: { total: 100, with_device: 80, no_device: 20, device_online: 60, device_offline: 20 },
  movement: { moving_now: 12, active_today: 50, inactive_today: 50 },
  trips: { total_today: 30, completed_this_month: 400, in_progress: 5, total_distance_km_this_month: 1234.5 },
  status_distribution: [{ status: 'active', count: 90 }, { status: 'maintenance', count: 10 }],
}

const device: DeviceHealth = {
  summary: { total: 100, online: 60, offline: 40, unassigned: 10 },
  last_seen_buckets: [
    { bucket: '< 1 hour', count: 50 },
    { bucket: '1–6 hours', count: 10 },
    { bucket: '6–24 hours', count: 10 },
    { bucket: '1–7 days', count: 10 },
    { bucket: '> 7 days', count: 15 },
    { bucket: 'never', count: 5 },
  ],
  signal_distribution: [
    { quality: 'excellent', range: '>= -70 dBm', count: 30 },
    { quality: 'good', range: '-70 to -85 dBm', count: 20 },
    { quality: 'fair', range: '-85 to -100 dBm', count: 5 },
    { quality: 'poor', range: '< -100 dBm', count: 2 },
  ],
  stale_devices: { threshold_days: 7, count: 15, devices: [{ imei: '351234', organization: 'Acme, Ltd', last_seen: '2026-09-01T10:00:00Z' }] },
}

const growth: GrowthAnalytics = {
  period: '30d',
  group_by: 'DAY',
  current: { organizations: 4, subscriptions: 3, users: 20, devices: 12 },
  previous: { organizations: 8, subscriptions: 3, users: 10, devices: 12 },
  change: {
    organizations: { value: -4, percent: -50 },
    subscriptions: { value: 0, percent: 0 },
    users: { value: 10, percent: 100 },
    devices: { value: 0, percent: 0 },
  },
  series: {
    organizations: [{ period: '2026-10-02', count: 1 }, { period: '2026-10-01', count: 3 }],
    subscriptions: [{ period: '2026-10-01', count: 3 }],
    users: [],
    devices: [],
  },
}

describe('operational report calculations', () => {
  it('treats an unknown or zero denominator as n/a rather than 0%', () => {
    expect(percent(5, 0)).toBeNull()
    expect(percent(undefined, 10)).toBeNull()
    expect(percent(0, 10)).toBe(0)
  })

  it('derives rates and the readiness score from the snapshot', () => {
    const rates = computeRates(fleet, device)
    expect(rates).toMatchObject({ coverage: 80, online: 75, activeToday: 50, freshness: 70, stale: 15, assignedDevices: 90 })
    expect(readinessScore(rates)).toBe(75)
    expect(readinessSeverity(75)).toBe('warning')
    expect(readinessScore(computeRates())).toBeNull()
  })

  it('formats backend period keys for each grouping', () => {
    expect(formatPeriodLabel('2026-10-04', 'DAY')).toBe('04 Oct')
    expect(formatPeriodLabel('2026-40', 'WEEK')).toBe('Wk 40')
    expect(formatPeriodLabel('2026-03', 'MONTH')).toBe('Mar 26')
  })

  it('merges growth series into sorted, zero-filled rows', () => {
    const rows = mergeGrowthSeries(growth)
    expect(rows.map((r) => r.period)).toEqual(['2026-10-01', '2026-10-02'])
    expect(rows[1]).toMatchObject({ organizations: 1, subscriptions: 0, users: 0 })
  })

  it('orders findings by severity and links to the affected records', () => {
    const findings = buildFindings(fleet, device, growth)
    expect(findings[0].severity).not.toBe('info')
    expect(findings.find((f) => f.id === 'offline')?.href).toBe('/devices?status=offline')
    expect(findings.some((f) => f.id === 'org-decline')).toBe(true)
    expect(findings.some((f) => f.id === 'all-clear')).toBe(false)
  })

  it('reports all clear when nothing needs attention', () => {
    const healthyFleet = { ...fleet, summary: { total: 10, with_device: 10, no_device: 0, device_online: 10, device_offline: 0 } }
    const healthyDevice: DeviceHealth = {
      ...device,
      summary: { ...device.summary, unassigned: 0 },
      last_seen_buckets: [{ bucket: '< 1 hour', count: 10 }],
      signal_distribution: [],
      stale_devices: { threshold_days: 7, count: 0, devices: [] },
    }
    expect(buildFindings(healthyFleet, healthyDevice).map((f) => f.id)).toEqual(['all-clear'])
  })

  it('exports a CSV with escaped values', () => {
    const csv = buildReportCsv(fleet, device, growth, new Date('2026-10-04T12:00:00Z'))
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Section,Metric,Value')
    expect(lines).toContain('Fleet,Total vehicles,100')
    expect(lines).toContain('Stale devices,351234,"Acme, Ltd | 2026-09-01T10:00:00Z"')
  })
})
