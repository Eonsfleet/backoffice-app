import { api } from '@/lib/api/client'
import type { Transaction, Invoice, PaginatedResponse } from '@/types/api'
import { normalizePaginated } from '@/lib/api/utils'

export const listTransactions = async (params?: {
  page?: number
  per_page?: number
  gateway?: string
  status?: string
  from_date?: string
  to_date?: string
}): Promise<PaginatedResponse<Transaction>> => {
  const { data } = await api.get('/admin/billing/transactions', { params })
  return normalizePaginated<Transaction>(data)
}

export const listInvoices = async (params?: {
  page?: number
  per_page?: number
  status?: string
  organization_id?: string | number
}): Promise<PaginatedResponse<Invoice>> => {
  const { data } = await api.get('/admin/billing/invoices', { params })
  return normalizePaginated<Invoice>(data)
}

export const downloadInvoice = async (id: string | number): Promise<void> => {
  const response = await api.get(`/admin/billing/invoices/${id}/download`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `invoice-${id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export const retryPayment = async (organizationId: string | number): Promise<void> => {
  await api.post(`/admin/billing/retry/${organizationId}`)
}

export const exportTransactions = async (params?: {
  from_date?: string
  to_date?: string
}): Promise<void> => {
  const response = await api.get('/admin/billing/transactions/export', {
    params,
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
