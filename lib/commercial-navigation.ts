import { BarChart3, CreditCard, FileText, Layers, PlusCircle, Receipt, Scale, Users } from 'lucide-react'
import type { NavigationItem } from './navigation'

export type CommercialArea = 'subscriptions' | 'billing'
export const COMMERCIAL_SECTIONS: Record<CommercialArea, (NavigationItem & { description: string })[]> = {
  subscriptions: [
    { href: '/subscriptions', label: 'Overview', description: 'Subscription health', icon: Layers, permission: 'admin.subscriptions.view' },
    { href: '/subscriptions/subscribers', label: 'Subscribers', description: 'POC and production accounts', icon: Users, permission: 'admin.subscriptions.view' },
    { href: '/subscriptions/plans', label: 'Plans', description: 'Pricing and limits', icon: Layers, permission: 'admin.subscriptions.view' },
    { href: '/subscriptions/addons', label: 'Add-ons', description: 'Optional modules', icon: PlusCircle, permission: 'admin.subscriptions.view' },
    { href: '/subscriptions/analytics', label: 'Analytics', description: 'Growth, MRR and churn', icon: BarChart3, permission: 'admin.subscriptions.view' },
  ],
  billing: [
    { href: '/billing', label: 'Overview', description: 'Finance work queue', icon: CreditCard, permission: 'admin.billing.view' },
    { href: '/billing/payments', label: 'Payments', description: 'Transactions and exports', icon: Receipt, permission: 'admin.billing.view' },
    { href: '/billing/invoices', label: 'Invoices', description: 'Documents and downloads', icon: FileText, permission: 'admin.billing.view' },
    { href: '/billing/reconciliation', label: 'Reconciliation', description: 'Settlement mismatches', icon: Scale, permission: 'admin.billing.money' },
  ],
}

export const LEGACY_BILLING_ROUTES: Record<string, string> = {
  '/subscriptions/transactions': '/billing/payments',
  '/subscriptions/invoices': '/billing/invoices',
  '/subscriptions/reconciliation': '/billing/reconciliation',
}

export function legacyBillingDestination(path: string, params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item))
    else if (value !== undefined) query.set(key, value)
  }
  const destination = LEGACY_BILLING_ROUTES[path]
  if (!destination) throw new Error('Unknown legacy billing route')
  return destination + (query.size ? `?${query.toString()}` : '')
}
