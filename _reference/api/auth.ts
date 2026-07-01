import apiClient from './client'
import type { LoginPayload, LoginResponse, AdminProfile } from '@/types'

export async function loginAdmin(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post('/admin/login', payload)
    return data.data
}

export async function logoutAdmin(): Promise<void> {
    await apiClient.get('/admin/logout')
}

export async function getAdminProfile(): Promise<AdminProfile> {
    const { data } = await apiClient.get('/admin/me')
    return data.data
}
