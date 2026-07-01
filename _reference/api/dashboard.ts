import apiClient from './client'
import type { DashboardMetrics } from '@/types'

export const getDashboardMetrics = async (): Promise<DashboardMetrics> =>
    (await apiClient.get('/admin/dashboard-metrics')).data.data

export const getDashboardOrganizations = async () =>
    (await apiClient.get('/admin/dashboard-organizations')).data.data

export const getSubscriptionMetrics = async () =>
    (await apiClient.get('/admin/dashboard-subscription-metrics')).data.data

export const getDeviceMetrics = async () =>
    (await apiClient.get('/admin/dashboard-device-metrics')).data.data

export const getOrgPerformance = async () =>
    (await apiClient.get('/admin/dashboard-org-performace')).data.data
