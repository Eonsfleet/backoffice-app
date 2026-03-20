import { api } from '@/lib/api/client'

export const getFleetHealthMetrics = async () => {
  const { data } = await api.get('/admin/analytics/fleet-health')
  return data.data
}

export const getDeviceHealthMetrics = async (params?: { days?: number }) => {
  const { data } = await api.get('/admin/analytics/device-health', { params })
  return data.data
}

export const getGrowthMetrics = async (params?: { months?: number }) => {
  const { data } = await api.get('/admin/analytics/growth', { params })
  return data.data
}

export const getPerformanceMetrics = async () => {
  const { data } = await api.get('/performance/metrics')
  return data.data
}
