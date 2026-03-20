import apiClient from './client'
import type { Device, Hardware, PaginatedResponse } from '@/types'

export const listDevices = async (params?: {
    page?: number
    per_page?: number
    q?: string
}): Promise<PaginatedResponse<Device>> =>
    (await apiClient.get('/devices', { params })).data

export const createDevice = async (payload: Partial<Device>): Promise<Device> =>
    (await apiClient.post('/devices', payload)).data.data

export const getDevice = async (id: number): Promise<Device> =>
    (await apiClient.get(`/devices/${id}`)).data.data

export const updateDevice = async (id: number, payload: Partial<Device>): Promise<Device> =>
    (await apiClient.put(`/devices/${id}`, payload)).data.data

export const deleteDevice = async (id: number): Promise<void> =>
    (await apiClient.delete(`/devices/${id}`)).data

export const createHardware = async (payload: Partial<Hardware>): Promise<Hardware> =>
    (await apiClient.post('/hardwares', payload)).data.data

export const getHardware = async (id: number): Promise<Hardware> =>
    (await apiClient.get(`/hardwares/${id}`)).data.data

export const updateHardware = async (id: number, payload: Partial<Hardware>): Promise<Hardware> =>
    (await apiClient.put(`/hardwares/${id}`, payload)).data.data

export const deleteHardware = async (id: number): Promise<void> =>
    (await apiClient.delete(`/hardwares/${id}`)).data
