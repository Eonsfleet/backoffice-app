import { api } from '@/lib/api/client'
import type { AuditLog, AuditLogFilters, PaginatedResponse, RiskLevel } from '@/types/api'

type RawAuditLog = {
  id: string | number
  attributes: {
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
    admin?: { id: string | number; name: string; email: string } | null
    organization?: { id: string | number; name: string } | null
  }
}

function normalizeLog(raw: RawAuditLog): AuditLog {
  const a = raw.attributes
  const rel = raw.relationships ?? {}
  return {
    id:           raw.id,
    action:       a.action,
    description:  a.description,
    subject_type: a.subject_type,
    subject_id:   a.subject_id != null ? String(a.subject_id) : null,
    method:       a.method,
    path:         a.path,
    ip_address:   a.ip_address,
    user_agent:   a.user_agent,
    old_values:   a.old_values ?? null,
    new_values:   a.new_values ?? null,
    risk_level:   a.risk_level,
    is_sensitive: a.is_sensitive,
    created_at:   a.created_at,
    admin:        rel.admin ?? { id: 0, name: 'Unknown', email: '' },
    organization: rel.organization ?? null,
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
  const response = await api.post('/admin/audit-logs/export', filters, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-logs-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
