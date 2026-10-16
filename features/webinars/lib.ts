import type { WebinarRegistrant } from './api'

const SEARCH_FIELDS: (keyof WebinarRegistrant)[] = ['name', 'email', 'secondary_email', 'phone', 'company', 'job_title', 'country', 'industry']

export function filterRegistrants(users: WebinarRegistrant[], query: string, country: string) {
  const q = query.trim().toLowerCase()
  return users.filter(user => (country === 'all' || user.country === country)
    && (!q || SEARCH_FIELDS.some(field => String(user[field] ?? '').toLowerCase().includes(q))))
}

export function uniqueValues(users: WebinarRegistrant[], field: 'country' | 'industry' | 'company') {
  return [...new Set(users.map(user => user[field]).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b))
}

// Guards against spreadsheet formula injection; phone numbers legitimately start with "+".
function csvCell(value: string | number | null | undefined, allowPlus = false) {
  let text = value == null ? '' : String(value)
  if (/^[=@\t\r]/.test(text) || (!allowPlus && /^[+-]/.test(text))) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function registrantsToCsv(users: WebinarRegistrant[]) {
  const columns: [string, (u: WebinarRegistrant) => string | number | null, boolean?][] = [
    ['Name', u => u.name], ['Email', u => u.email], ['Secondary email', u => u.secondary_email], ['Phone', u => u.phone, true],
    ['Company', u => u.company], ['Job title', u => u.job_title], ['Country', u => u.country], ['Industry', u => u.industry],
    ['Fleet size', u => u.fleet_size], ['Role', u => u.role], ['Registered at', u => u.registered_at],
  ]
  return [columns.map(([h]) => h).join(','), ...users.map(u => columns.map(([, get, plus]) => csvCell(get(u), plus)).join(','))].join('\r\n')
}
