import type { DeviceHealth, FleetHealth, GrowthAnalytics } from '@/features/analytics/api'

export type Severity = 'critical' | 'warning' | 'info' | 'healthy'

export const GROWTH_SERIES = [
  { key: 'organizations', label: 'Organizations', color: '#2563eb' },
  { key: 'subscriptions', label: 'Subscriptions', color: '#0d9488' },
  { key: 'users', label: 'Users', color: '#7c3aed' },
  { key: 'devices', label: 'Devices', color: '#d97706' },
] as const

export type GrowthKey = typeof GROWTH_SERIES[number]['key']

export const GROWTH_PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last 12 months' },
] as const

export const STALE_THRESHOLDS = [3, 7, 14, 30] as const

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-GB').format(value)
}

export function formatKm(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(value)} km`
}

/** Whole-number share; returns null when the denominator is unknown or zero so the UI can say "n/a" instead of a misleading 0%. */
export function percent(part?: number | null, total?: number | null): number | null {
  if (part == null || !total) return null
  return Math.round((part / total) * 100)
}

export function formatPercent(value: number | null) {
  return value == null ? 'n/a' : `${value}%`
}

export function titleCase(value: string) {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

/** Backend periods are `Y-m-d` (day), `Y-W` (ISO week) or `Y-m` (month). */
export function formatPeriodLabel(period: string, groupBy?: string) {
  const [year, second, third] = period.split('-')
  if (groupBy === 'WEEK') return `Wk ${Number(second)}`
  if (groupBy === 'MONTH' || third === undefined) return `${MONTHS[Number(second) - 1] ?? second} ${year.slice(2)}`
  return `${third} ${MONTHS[Number(second) - 1] ?? second}`
}

export function mergeGrowthSeries(growth?: GrowthAnalytics) {
  if (!growth?.series) return []
  const periods = new Set<string>()
  GROWTH_SERIES.forEach(({ key }) => growth.series[key]?.forEach((point) => periods.add(point.period)))
  return Array.from(periods).sort().map((period) => {
    const row: Record<string, string | number> = { period, label: formatPeriodLabel(period, growth.group_by) }
    GROWTH_SERIES.forEach(({ key }) => {
      row[key] = growth.series[key]?.find((point) => point.period === period)?.count ?? 0
    })
    return row
  })
}

export interface ReportRates {
  coverage: number | null
  online: number | null
  activeToday: number | null
  freshness: number | null
  stale: number | null
  assignedDevices: number | null
}

export function computeRates(fleet?: FleetHealth, device?: DeviceHealth): ReportRates {
  // Devices that reported within the last 24 hours — the first three last-seen buckets.
  const fresh = device?.last_seen_buckets.slice(0, 3).reduce((sum, b) => sum + b.count, 0)
  return {
    coverage: percent(fleet?.summary.with_device, fleet?.summary.total),
    online: percent(fleet?.summary.device_online, fleet?.summary.with_device),
    activeToday: percent(fleet?.movement.active_today, fleet?.summary.total),
    freshness: percent(fresh, device?.summary.total),
    stale: percent(device?.stale_devices.count, device?.summary.total),
    assignedDevices: device ? percent(device.summary.total - device.summary.unassigned, device.summary.total) : null,
  }
}

/**
 * Operational readiness: the mean of device coverage, online rate of tracked
 * vehicles and 24-hour device freshness. Each factor is shown alongside the
 * score so the composite is never a black box.
 */
export function readinessScore(rates: ReportRates): number | null {
  const factors = [rates.coverage, rates.online, rates.freshness].filter((v): v is number => v != null)
  if (!factors.length) return null
  return Math.round(factors.reduce((sum, v) => sum + v, 0) / factors.length)
}

export function readinessSeverity(score: number | null): Severity {
  if (score == null) return 'info'
  if (score >= 85) return 'healthy'
  if (score >= 65) return 'warning'
  return 'critical'
}

export function readinessLabel(score: number | null) {
  const severity = readinessSeverity(score)
  return { healthy: 'Healthy', warning: 'Needs attention', critical: 'At risk', info: 'Not enough data' }[severity]
}

export interface Finding {
  id: string
  severity: Severity
  title: string
  detail: string
  href?: string
  action?: string
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2, healthy: 3 }

export function buildFindings(fleet?: FleetHealth, device?: DeviceHealth, growth?: GrowthAnalytics): Finding[] {
  const findings: Finding[] = []
  const rates = computeRates(fleet, device)

  if (fleet) {
    const { no_device, device_offline, total, with_device } = fleet.summary
    if (no_device > 0) findings.push({
      id: 'no-device', severity: (rates.coverage ?? 100) < 70 ? 'critical' : 'warning',
      title: `${formatNumber(no_device)} vehicles have no tracking device`,
      detail: `${formatPercent(percent(no_device, total))} of the fleet cannot be monitored until a device is installed.`,
      href: '/vehicles', action: 'Review vehicles',
    })
    if (device_offline > 0) findings.push({
      id: 'offline', severity: (rates.online ?? 100) < 70 ? 'critical' : 'warning',
      title: `${formatNumber(device_offline)} tracked vehicles are offline`,
      detail: `${formatPercent(percent(device_offline, with_device))} of vehicles with a device are not currently reporting.`,
      href: '/devices?status=offline', action: 'View offline devices',
    })
  }

  if (device) {
    if (device.stale_devices.count > 0) findings.push({
      id: 'stale', severity: 'warning',
      title: `${formatNumber(device.stale_devices.count)} devices silent for ${device.stale_devices.threshold_days}+ days`,
      detail: 'Likely power loss, removal or SIM issues. Schedule an installer check or contact the customer.',
    })
    const never = device.last_seen_buckets.find((b) => b.bucket === 'never')?.count ?? 0
    if (never > 0) findings.push({
      id: 'never', severity: 'info',
      title: `${formatNumber(never)} devices have never reported`,
      detail: 'These are usually new stock or installations that were never activated.',
      href: '/devices', action: 'Open devices',
    })
    const poor = device.signal_distribution.find((s) => s.quality === 'poor')?.count ?? 0
    if (poor > 0) findings.push({
      id: 'poor-signal', severity: 'info',
      title: `${formatNumber(poor)} devices on poor signal`,
      detail: 'Latest readings below -100 dBm in the last 24 hours. Expect delayed or missing location updates.',
    })
    if (device.summary.unassigned > 0) findings.push({
      id: 'unassigned', severity: 'info',
      title: `${formatNumber(device.summary.unassigned)} devices not linked to an organization`,
      detail: 'Inventory that is not yet billable. Assign it or confirm it is spare stock.',
      href: '/devices', action: 'Open devices',
    })
  }

  if (growth) {
    const orgChange = growth.change.organizations
    if (orgChange.value < 0) findings.push({
      id: 'org-decline', severity: 'warning',
      title: `New organizations down ${Math.abs(orgChange.percent)}%`,
      detail: `${formatNumber(growth.current.organizations)} onboarded this period versus ${formatNumber(growth.previous.organizations)} in the previous one.`,
      href: '/organizations', action: 'Open organizations',
    })
    else if (orgChange.value > 0) findings.push({
      id: 'org-growth', severity: 'healthy',
      title: `New organizations up ${orgChange.percent}%`,
      detail: `${formatNumber(growth.current.organizations)} onboarded this period versus ${formatNumber(growth.previous.organizations)} in the previous one.`,
    })
  }

  if (fleet && device && !findings.some((f) => f.severity === 'critical' || f.severity === 'warning')) {
    findings.push({ id: 'all-clear', severity: 'healthy', title: 'No operational issues detected', detail: 'Every tracked vehicle is reporting and no devices have gone stale.' })
  }

  return findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildReportCsv(fleet?: FleetHealth, device?: DeviceHealth, growth?: GrowthAnalytics, generatedAt = new Date()) {
  const rows: unknown[][] = [['Section', 'Metric', 'Value']]
  const push = (section: string, metric: string, value: unknown) => rows.push([section, metric, value ?? ''])
  const rates = computeRates(fleet, device)

  push('Report', 'Generated at (UTC)', generatedAt.toISOString())
  push('Summary', 'Operational readiness (%)', readinessScore(rates))
  push('Summary', 'Device coverage (%)', rates.coverage)
  push('Summary', 'Online rate of tracked vehicles (%)', rates.online)
  push('Summary', 'Devices reporting in last 24h (%)', rates.freshness)

  if (fleet) {
    push('Fleet', 'Total vehicles', fleet.summary.total)
    push('Fleet', 'Vehicles with device', fleet.summary.with_device)
    push('Fleet', 'Vehicles without device', fleet.summary.no_device)
    push('Fleet', 'Tracked vehicles online', fleet.summary.device_online)
    push('Fleet', 'Tracked vehicles offline', fleet.summary.device_offline)
    push('Fleet', 'Moving now', fleet.movement.moving_now)
    push('Fleet', 'Active today', fleet.movement.active_today)
    push('Fleet', 'Inactive today', fleet.movement.inactive_today)
    push('Trips', 'Trips today', fleet.trips.total_today)
    push('Trips', 'In progress', fleet.trips.in_progress)
    push('Trips', 'Completed this month', fleet.trips.completed_this_month)
    push('Trips', 'Distance this month (km)', fleet.trips.total_distance_km_this_month)
    fleet.status_distribution.forEach((s) => push('Vehicle status', titleCase(s.status), s.count))
  }

  if (device) {
    push('Devices', 'Total devices', device.summary.total)
    push('Devices', 'Online', device.summary.online)
    push('Devices', 'Offline', device.summary.offline)
    push('Devices', 'Unassigned', device.summary.unassigned)
    device.last_seen_buckets.forEach((b) => push('Last seen', b.bucket, b.count))
    device.signal_distribution.forEach((s) => push('Signal quality', `${titleCase(s.quality)} (${s.range})`, s.count))
    push('Stale devices', `Silent for ${device.stale_devices.threshold_days}+ days`, device.stale_devices.count)
    device.stale_devices.devices.forEach((d) => push('Stale devices', d.imei, [d.organization ?? 'Unassigned', d.last_seen ?? 'never'].join(' | ')))
  }

  if (growth) {
    GROWTH_SERIES.forEach(({ key, label }) => {
      push(`Growth (${growth.period})`, `New ${label.toLowerCase()} — current`, growth.current[key])
      push(`Growth (${growth.period})`, `New ${label.toLowerCase()} — previous`, growth.previous[key])
      push(`Growth (${growth.period})`, `New ${label.toLowerCase()} — change (%)`, growth.change[key].percent)
    })
  }

  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}
