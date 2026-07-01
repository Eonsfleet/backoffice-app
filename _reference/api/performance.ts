import apiClient from './client'

export const getPerformanceMetrics = async () =>
    (await apiClient.get('/performance/metrics')).data.data

export const getDatabaseStats = async () =>
    (await apiClient.get('/performance/database')).data.data
