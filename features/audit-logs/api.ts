import { api } from '@/lib/api/client'
import type { AuditLog, AuditLogFilters, PaginatedResponse, RiskLevel } from '@/types/api'

type RawAuditLog = {
  id: string | number
  attributes?: {
    action: string
    subject_type?: string
    subject_id?: string | number | null
    description?: string
    method?: string
    path?: string
    ip_address: string
    user_agent?: string
    old_values?: Record<string, unknown> | null
    new_values?: Record<string, unknown> | null
    risk_level: RiskLevel
    is_sensitive: boolean
    created_at: string
    updated_at?: string
  }
  relationships?: {
    admin?: RawRelationship<{ name: string; email: string }> | null
    organization?: RawRelationship<{ name: string }> | null
  }
  action?: string
  source?: string
  actor_type?: 'admin' | 'tenant_user' | 'system' | string
  actor?: { id: string | number; name: string; email: string } | null
  subject_type?: string
  subject_id?: string | number | null
  description?: string
  method?: string
  path?: string
  ip_address?: string
  user_agent?: string
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  risk_level?: RiskLevel
  is_sensitive?: boolean
  created_at?: string
  updated_at?: string
  admin?: { id: string | number; name: string; email: string } | null
  organization?: { id: string | number; name: string } | null
}

type RawRelationship<T> = ({ id: string | number } & T) | {
  id: string | number
  attributes?: T
}

function normalizeRelated<T extends { name?: string; email?: string }>(
  value?: RawRelationship<T> | T | null
): ({ id: string | number } & T) | null {
  if (!value || typeof value !== 'object') return null
  const id = 'id' in value ? value.id : 0
  const attributes = 'attributes' in value && value.attributes ? value.attributes : value
  return { id, ...(attributes as T) }
}

function normalizeLog(raw: RawAuditLog): AuditLog {
  const a = raw.attributes ?? raw
  const rel = raw.relationships ?? {}
  const admin = normalizeRelated(rel.admin ?? raw.admin)
  const organization = normalizeRelated(rel.organization ?? raw.organization)
  const actor = normalizeRelated(raw.actor ?? admin)

  return {
    id:           raw.id,
    source:       raw.source,
    actor_type:   raw.actor_type,
    actor:        actor ? { id: actor.id, name: actor.name ?? 'Unknown', email: actor.email ?? '' } : null,
    action:       a.action ?? 'Unknown action',
    description:  a.description,
    subject_type: a.subject_type,
    subject_id:   a.subject_id != null ? String(a.subject_id) : null,
    method:       a.method,
    path:         a.path,
    ip_address:   a.ip_address ?? '—',
    user_agent:   a.user_agent,
    old_values:   a.old_values ?? null,
    new_values:   a.new_values ?? null,
    risk_level:   a.risk_level ?? 'low',
    is_sensitive: a.is_sensitive ?? false,
    created_at:   a.created_at ?? new Date(0).toISOString(),
    admin:        admin ? { id: admin.id, name: admin.name ?? 'Unknown', email: admin.email ?? '' } : { id: 0, name: actor?.name ?? 'Unknown', email: actor?.email ?? '' },
    organization: organization ? { id: organization.id, name: organization.name ?? '—' } : null,
  }
}

export const listAuditLogs = async (
  filters: AuditLogFilters = {}
): Promise<PaginatedResponse<AuditLog>> => {
  const { data } = await api.get('/admin/audit-logs', { params: filters })

  // Response: { message, data: RawAuditLog[] } — array directly under data
  const raw: RawAuditLog[] = Array.isArray(data.data)
    ? data.data
    : Array.isArray(data.data?.data)
      ? data.data.data
      : []

  const meta = data.meta ?? data.data?.meta ?? {
    current_page: 1,
    last_page:    1,
    per_page:     raw.length,
    total:        raw.length,
  }

  return { data: raw.map(normalizeLog), meta }
}

export const getAuditLog = async (id: string | number): Promise<AuditLog> => {
  const { data } = await api.get(`/admin/audit-logs/${id}`)
  const raw = data.data ?? data
  return normalizeLog(raw as RawAuditLog)
}

export const getAuditLogSummary = async () => {
  const { data } = await api.get('/admin/audit-logs/summary')
  return data.data
}

export const exportAuditLogs = async (filters: AuditLogFilters = {}): Promise<void> => {
  const response = await api.get('/admin/audit-logs/export', {
    params: filters,
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-logs-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
