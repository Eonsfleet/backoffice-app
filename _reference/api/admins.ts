import apiClient from './client'
import type { AdminUser, PaginatedResponse } from '@/types'

export const listAdmins = async (params?: {
    page?: number
    per_page?: number
    q?: string
}): Promise<PaginatedResponse<AdminUser>> =>
    (await apiClient.get('/admins', { params })).data

export const createAdmin = async (payload: {
    name: string
    email: string
    password: string
    role: string
}): Promise<AdminUser> =>
    (await apiClient.post('/admins', payload)).data.data

export const updateAdmin = async (
    id: number, payload: Partial<AdminUser>
): Promise<AdminUser> =>
    (await apiClient.put(`/admins/${id}`, payload)).data.data

export const deleteAdmin = async (id: number): Promise<void> =>
    (await apiClient.delete(`/admins/${id}`)).data
