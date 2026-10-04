import { describe, expect, it, vi } from 'vitest'
import { COMMERCIAL_SECTIONS, legacyBillingDestination } from '@/lib/commercial-navigation'
import { canAccessNavigation, getRouteItem } from '@/lib/navigation'
import { listInvoices, listReconciliationMismatches, listTransactions } from '@/features/subscriptions/api'
import { api } from '@/lib/api/client'
import type { AdminUser } from '@/types/api'

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn() } }))
const user = (role: string, permissions?: string[]) => ({ id: '1', role, permissions } as AdminUser)

describe('subscription and billing separation', () => {
  it('keeps finance workflows out of subscription navigation', () => {
    expect(COMMERCIAL_SECTIONS.subscriptions.map(item => item.href)).toEqual(['/subscriptions', '/subscriptions/subscribers', '/subscriptions/plans', '/subscriptions/addons', '/subscriptions/analytics'])
    expect(COMMERCIAL_SECTIONS.billing.map(item => item.href)).toEqual(['/billing', '/billing/payments', '/billing/invoices', '/billing/reconciliation'])
  })
  it('authorizes payment pages separately from subscriptions, including legacy routes', () => {
    const billingOnly = user('custom', ['admin.billing.view'])
    expect(canAccessNavigation(billingOnly, getRouteItem('/billing/payments')!)).toBe(true)
    expect(canAccessNavigation(billingOnly, getRouteItem('/subscriptions/transactions')!)).toBe(true)
    expect(canAccessNavigation(billingOnly, getRouteItem('/subscriptions')!)).toBe(false)
    expect(canAccessNavigation(user('custom', ['admin.subscriptions.view']), getRouteItem('/billing/payments')!)).toBe(false)
  })
  it('keeps reconciliation restricted to finance authorization', () => {
    expect(canAccessNavigation(user('support'), getRouteItem('/billing/reconciliation')!)).toBe(false)
    expect(canAccessNavigation(user('support'), getRouteItem('/subscriptions/reconciliation')!)).toBe(false)
    expect(canAccessNavigation(user('finance'), getRouteItem('/billing/reconciliation')!)).toBe(true)
  })
  it('preserves filters and repeated query values when redirecting a bookmark', () => {
    const url = new URL(legacyBillingDestination('/subscriptions/transactions', { status: 'failed', page: '2', q: 'Fleet & Co', tag: ['one', 'two'] }), 'http://localhost')
    expect(url.pathname).toBe('/billing/payments')
    expect(url.searchParams.get('status')).toBe('failed')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('q')).toBe('Fleet & Co')
    expect(url.searchParams.getAll('tag')).toEqual(['one', 'two'])
  })
  it('sends payment search and method using the confirmed API contract', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { transactions: [], pagination: { total: 0 } } } })
    await listTransactions({ page: 2, q: 'fleet', payment_method: 'manual' })
    expect(api.get).toHaveBeenCalledWith('/admins/subscriptions/transactions', { params: { page: 2, q: 'fleet', payment_method: 'manual' } })
  })
  it('sends the selected reconciliation page to the API', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { data: [], current_page: 2, last_page: 2, total: 30, per_page: 25 } } })
    const result = await listReconciliationMismatches({ page: 2, status: 'open' })
    expect(api.get).toHaveBeenCalledWith('/admins/billing/reconciliation/mismatches', { params: { page: 2, status: 'open' } })
    expect(result.meta).toEqual({ current_page: 2, last_page: 2, total: 30, per_page: 25 })
  })
  it('searches across invoices using the server query contract', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [], meta: { total: 0 } } })
    await listInvoices({ q: 'INV-42', status: 'issued', page: 2 })
    expect(api.get).toHaveBeenCalledWith('/admins/subscriptions/invoices', { params: { q: 'INV-42', status: 'issued', page: 2 } })
  })
})
