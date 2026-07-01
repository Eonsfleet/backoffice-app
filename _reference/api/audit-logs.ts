import apiClient from './client'
import type { AuditLog, PaginatedResponse } from '@/types'

export interface AuditLogFilters {
    page?: number
    per_page?: number
    admin_id?: number
    organization_id?: number
    action?: string
    risk_level?: string
    is_sensitive?: boolean
    from_date?: string
    to_date?: string
}

export const listAuditLogs = async (
    filters: AuditLogFilters = {}
): Promise<PaginatedResponse<AuditLog>> =>
    (await apiClient.get('/admin/audit-logs', { params: filters })).data

export const getAuditLogSummary = async () =>
    (await apiClient.get('/admin/audit-logs/summary')).data.data

export const exportAuditLogs = async (from_date: string, to_date: string) => {
    const response = await apiClient.get('/admin/audit-logs/export', {
        params: { from_date, to_date },
        responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([response.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${from_date}-to-${to_date}.csv`
    a.click()
    URL.revokeObjectURL(url)
}
