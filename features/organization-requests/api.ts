import { api } from '@/lib/api/client'
import type { PaginatedResponse } from '@/types/api'

export type OrganizationRequestStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'cancelled' | string

export interface OrganizationRequest {
  id: string | number
  type: string
  subject: string
  details?: string | null
  metadata?: Record<string, unknown> | null
  status: OrganizationRequestStatus
  review_note?: string | null
  reviewed_at?: string | null
  requested_by?: { id: string | number; name: string; email?: string | null } | null
  reviewed_by?: { id: string | number; name: string; email?: string | null } | null
  organization?: { id: string | number; identifier?: string | null; name: string } | null
  created_at?: string | null
  updated_at?: string | null
}

export interface OrganizationRequestFilters {
  page?: number
  per_page?: number
  organization_id?: string | number
  status?: string
  type?: string
}

function normalizeRequest(raw: unknown): OrganizationRequest {
  if (!raw || typeof raw !== 'object') return {} as OrganizationRequest
  const item = raw as Record<string, unknown>
  const attributes = (item.attributes && typeof item.attributes === 'object')
    ? (item.attributes as Record<string, unknown>)
    : item
  const relationships = (item.relationships && typeof item.relationships === 'object')
    ? (item.relationships as Record<string, unknown>)
    : {}

  return {
    id:           (item.id ?? attributes.id) as string | number,
    ...(attributes as Omit<OrganizationRequest, 'id'>),
    ...(relationships as Partial<OrganizationRequest>),
  }
}

export const listOrganizationRequests = async (
  params?: OrganizationRequestFilters
): Promise<PaginatedResponse<OrganizationRequest>> => {
  const { data } = await api.get('/admin/organization-requests', { params })
  const inner = data.data ?? data
  const raw: unknown[] = inner.requests ?? inner.data ?? []
  const pg = inner.pagination ?? inner.meta

  return {
    data: raw.map(normalizeRequest),
    meta: {
      current_page: pg?.current_page ?? pg?.current ?? params?.page ?? 1,
      last_page:    pg?.last_page    ?? pg?.lastPage ?? 1,
      per_page:     pg?.per_page     ?? pg?.perPage  ?? raw.length,
      total:        pg?.total        ?? raw.length,
    },
  }
}

export const getOrganizationRequest = async (id: string | number): Promise<OrganizationRequest> => {
  const { data } = await api.get(`/admin/organization-requests/${id}`)
  return normalizeRequest(data.data ?? data)
}

export const reviewOrganizationRequest = async (
  id: string | number,
  payload: { status: 'in_review' | 'approved' | 'rejected'; review_note?: string | null }
): Promise<OrganizationRequest> => {
  const { data } = await api.patch(`/admin/organization-requests/${id}/review`, payload)
  return normalizeRequest(data.data ?? data)
}
