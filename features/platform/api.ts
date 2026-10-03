import { z } from 'zod'
import { api } from '@/lib/api/client'

const number = z.number().finite().nonnegative().optional()
const serviceSchema = z.object({
  status: z.enum(['up', 'down', 'degraded']),
  latency_ms: number, pending_jobs: number, failed_jobs: number, disk_usage_percent: number,
})
const healthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']), timestamp: z.string().datetime({ offset: true }),
  services: z.record(z.string(), serviceSchema),
})
export type PlatformHealth = z.infer<typeof healthSchema>

export async function getPlatformHealth(signal?: AbortSignal): Promise<PlatformHealth> {
  // 503 is a valid unhealthy readiness result, not an empty/error-only screen.
  const { data } = await api.get('/health', { signal, validateStatus: status => status === 200 || status === 503 })
  // Strip diagnostics/configuration. Raw exception text must not reach the view.
  return healthSchema.parse(data)
}

const installerSchema = z.object({
  id: z.union([z.string(), z.number()]),
  attributes: z.object({ name: z.string().nullish(), email: z.string().nullish(), phone: z.string().nullish(), status: z.string().nullish() }),
  relationships: z.object({ organizations: z.array(z.object({ id: z.union([z.string(), z.number()]), identifier: z.string().nullish(), name: z.string() })).optional() }).optional(),
})
const installersSchema = z.object({
  installers: z.array(installerSchema),
  pagination: z.object({ current: z.number(), lastPage: z.number(), total: z.number(), perPage: z.number() }),
})
export type Installer = z.infer<typeof installerSchema>
export async function listInstallers(params: { page: number; perPage: number; q?: string }, signal?: AbortSignal) {
  const { data } = await api.get('/admin/admins/installers', { params, signal })
  return installersSchema.parse(data.data)
}

const templateSchema = z.object({
  id: z.number().int(), channel: z.string(), subject: z.string().nullable(), body: z.string(), edited: z.boolean(),
})
const notificationTypeSchema = z.object({
  code: z.string(), name: z.string(), category: z.string(), priority: z.string(),
  is_mandatory: z.boolean(), templates: z.array(templateSchema),
})
export type NotificationTemplate = z.infer<typeof templateSchema>
export type NotificationType = z.infer<typeof notificationTypeSchema>
export async function listNotificationTemplates(signal?: AbortSignal) {
  const { data } = await api.get('/admin/notification-templates', { signal })
  return z.array(notificationTypeSchema).parse(data.data)
}
export async function updateNotificationTemplate(id: number, payload: { subject: string | null; body: string }) {
  await api.put(`/admin/notification-templates/${id}`, payload)
}
export async function resetNotificationTemplate(id: number) {
  await api.post(`/admin/notification-templates/${id}/reset`)
}
