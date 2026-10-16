import { api } from '@/lib/api/client'

export interface WebinarRegistrant {
  id: string | number
  name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  secondary_email: string | null
  phone: string | null
  company: string | null
  job_title: string | null
  country: string | null
  industry: string | null
  fleet_size: string | null
  role: string | null
  registered_at: string | null
}

export interface WebinarRegistrations {
  total: number
  phone_numbers: string[]
  users: WebinarRegistrant[]
}

type Raw = Partial<Record<keyof WebinarRegistrant, unknown>> & { id: string | number }

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

export function normalizeRegistrant(raw: Raw): WebinarRegistrant {
  const first = text(raw.first_name)
  const last = text(raw.last_name)
  return {
    id: raw.id,
    name: text(raw.name) ?? ([first, last].filter(Boolean).join(' ') || null),
    first_name: first,
    last_name: last,
    email: text(raw.email),
    secondary_email: text(raw.secondary_email),
    phone: text(raw.phone),
    company: text(raw.company),
    job_title: text(raw.job_title),
    country: text(raw.country),
    industry: text(raw.industry),
    fleet_size: text(raw.fleet_size),
    role: text(raw.role),
    registered_at: text(raw.registered_at),
  }
}

export function normalizeRegistrations(body: unknown): WebinarRegistrations {
  const data = (body as { data?: Record<string, unknown> } | null)?.data
  const users = Array.isArray(data?.users) ? (data.users as Raw[]).map(normalizeRegistrant) : []
  const phones = Array.isArray(data?.phone_numbers) ? (data.phone_numbers as unknown[]).filter((p): p is string => typeof p === 'string' && p.length > 0) : []
  return { total: typeof data?.total === 'number' ? data.total : users.length, phone_numbers: phones, users }
}

export async function listWebinarRegistrations(): Promise<WebinarRegistrations> {
  const { data } = await api.get('/admin/webinar-registrations/users')
  return normalizeRegistrations(data)
}
