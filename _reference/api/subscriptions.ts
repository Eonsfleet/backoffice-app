import apiClient from './client'
import type { Subscription, Plan, Feature, Addon, PaginatedResponse } from '@/types'

export const listSubscriptions = async (params?: {
    page?: number; per_page?: number; q?: string; status?: string
}): Promise<PaginatedResponse<Subscription>> =>
    (await apiClient.get('/admins/subscriptions', { params })).data

export const getSubscription = async (id: number): Promise<Subscription> =>
    (await apiClient.get(`/admins/subscriptions/${id}/show`)).data.data

export const listPlans = async (): Promise<Plan[]> =>
    (await apiClient.get('/admins/subscriptions/plans')).data.data

export const createPlan = async (payload: Partial<Plan>): Promise<Plan> =>
    (await apiClient.post('/admins/subscriptions/plans', payload)).data.data

export const updatePlan = async (id: number, payload: Partial<Plan>): Promise<Plan> =>
    (await apiClient.put(`/admins/subscriptions/${id}`, payload)).data.data

export const listFeatures = async (): Promise<Feature[]> =>
    (await apiClient.get('/admins/subscriptions/features')).data.data

export const createFeature = async (payload: Partial<Feature>): Promise<Feature> =>
    (await apiClient.post('/admins/subscriptions/features', payload)).data.data

export const listAddons = async (): Promise<Addon[]> =>
    (await apiClient.get('/admins/subscriptions/addons')).data.data

export const createAddon = async (payload: Partial<Addon>): Promise<Addon> =>
    (await apiClient.post('/admins/subscriptions/addons', payload)).data.data
