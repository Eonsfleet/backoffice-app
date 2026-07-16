import { api } from '@/lib/api/client'
import type { PaginatedResponse } from '@/types/api'

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error' | 'critical' | string
export type NotificationStatus = 'all' | 'read' | 'unread'

export interface AdminNotification {
  id: string
  type: string
  title: string
  message: string | null
  category: string
  severity: NotificationSeverity
  action_url: string | null
  data: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
}

interface NotificationListParams {
  page?: number
  per_page?: number
  status?: NotificationStatus
}

interface RawNotification {
  id: string
  type?: string
  title?: string
  message?: string | null
  category?: string
  severity?: NotificationSeverity
  action_url?: string | null
  data?: Record<string, unknown>
  is_read?: boolean
  read_at?: string | null
  created_at?: string
  attributes?: {
    type?: string
    subject?: string | null
    body?: string | null
    data?: Record<string, unknown>
    is_read?: boolean
    read_at?: string | null
    created_at?: string
  }
}

const emptyMeta = {
  current_page: 1,
  last_page:    1,
  per_page:     0,
  total:        0,
}

function normalizeNotification(raw: RawNotification): AdminNotification {
  const attrs = raw.attributes
  const data = raw.data ?? attrs?.data ?? {}

  return {
    id:         raw.id,
    type:       raw.type ?? attrs?.type ?? 'system',
    title:      raw.title ?? attrs?.subject ?? 'Notification',
    message:    raw.message ?? attrs?.body ?? null,
    category:   raw.category ?? String(data.category ?? 'system'),
    severity:   raw.severity ?? String(data.severity ?? 'info'),
    action_url: raw.action_url ?? (typeof data.action_url === 'string' ? data.action_url : null),
    data,
    is_read:    raw.is_read ?? attrs?.is_read ?? false,
    read_at:    raw.read_at ?? attrs?.read_at ?? null,
    created_at: raw.created_at ?? attrs?.created_at ?? new Date(0).toISOString(),
  }
}

export async function listNotifications(
  params: NotificationListParams = {}
): Promise<PaginatedResponse<AdminNotification>> {
  const { data } = await api.get('/admin/notifications', { params })
  const payload = data.data ?? data
  const raw = Array.isArray(payload.notifications)
    ? payload.notifications
    : Array.isArray(payload.data)
      ? payload.data
      : []

  return {
    data: raw.map(normalizeNotification),
    meta: payload.pagination ?? payload.meta ?? emptyMeta,
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await api.get('/admin/notifications/unread-count')
  return Number(data.data?.count ?? data.count ?? 0)
}

export async function markNotificationAsRead(id: string): Promise<AdminNotification> {
  const { data } = await api.patch(`/admin/notifications/${id}/read`)
  return normalizeNotification(data.data ?? data)
}

export async function markAllNotificationsAsRead(): Promise<number> {
  const { data } = await api.patch('/admin/notifications/read-all')
  return Number(data.data?.marked_count ?? data.marked_count ?? 0)
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/admin/notifications/${id}`)
}
