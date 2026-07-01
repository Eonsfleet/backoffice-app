import apiClient from './client'
import type { Organization, PaginatedResponse } from '@/types'

export const listOrganizations = async (params?: {
    page?: number
    per_page?: number
    q?: string
}): Promise<PaginatedResponse<Organization>> => {
    const response = await apiClient.get('/organizations', { params })
    const result = response.data.data

    return {
        data: result.organizations.map((org: any) => ({
            id: Number(org.id),
            ...org.attributes
        })),
        meta: {
            current_page: result.pagination?.current || 1,
            last_page: result.pagination?.lastPage || 1,
            per_page: result.pagination?.perPage || 20,
            total: result.pagination?.total || 0,
        }
    }
}

export const createOrganization = async (
    payload: Partial<Organization> | any
): Promise<Organization> => {
    const response = await apiClient.post('/organizations', payload)
    const org = response.data.data
    return org.attributes ? { id: Number(org.id), ...org.attributes } : org
}

export const deleteOrganization = async (id: number): Promise<void> => {
    await apiClient.delete(`/organizations/${id}`)
}

export const getOrganization = async (id: number): Promise<Organization> => {
    const response = await apiClient.get(`/organizations/${id}`)
    const org = response.data.data
    return org.attributes ? { id: Number(org.id), ...org.attributes } : org
}
