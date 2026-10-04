'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FileText, Receipt, Scale } from 'lucide-react'
import { BillingWorkspace } from './BillingWorkspace'
import { listInvoices, listReconciliationMismatches, listTransactions } from '@/features/subscriptions/api'
import { usePermission } from '@/hooks/usePermission'
import { KpiCard } from '@/components/shared/KpiCard'
import { QueryError } from '@/components/shared/QueryError'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Timestamp } from '@/components/shared/Timestamp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function amount(value: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
}

export default function BillingOverview() {
  const canReconcile = usePermission('admin.billing.money')
  const payments = useQuery({ queryKey: ['transactions', { page: 1, per_page: 5 }], queryFn: () => listTransactions({ page: 1, per_page: 5 }), staleTime: 30_000 })
  const invoices = useQuery({ queryKey: ['invoices', { page: 1, per_page: 5 }], queryFn: () => listInvoices({ page: 1, per_page: 5 }), staleTime: 30_000 })
  const reconciliation = useQuery({ queryKey: ['reconciliation-mismatches', { status: 'open', page: 1 }], queryFn: () => listReconciliationMismatches({ status: 'open', page: 1 }), enabled: canReconcile, staleTime: 30_000 })
  return <BillingWorkspace title="Billing & payments overview" description="Review payment records, download invoices, and resolve provider settlement mismatches." actions={<Button asChild><Link href="/billing/payments">View payments<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}>
    <div className={`grid gap-4 sm:grid-cols-2 ${canReconcile ? 'xl:grid-cols-3' : ''}`}>
      <KpiCard label="Payment records" value={payments.data?.meta.total} isLoading={payments.isLoading} icon={Receipt} href="/billing/payments" />
      <KpiCard label="Invoice records" value={invoices.data?.meta.total} isLoading={invoices.isLoading} icon={FileText} href="/billing/invoices" />
      {canReconcile && <KpiCard label="Open reconciliation issues" value={reconciliation.data?.meta.total} isLoading={reconciliation.isLoading} icon={Scale} href="/billing/reconciliation?status=open" />}
    </div>
    {canReconcile && reconciliation.error && <QueryError error={reconciliation.error} retry={() => void reconciliation.refetch()} label="reconciliation totals" />}
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle className="text-base">Recent payments</CardTitle><Button variant="ghost" size="sm" asChild><Link href="/billing/payments">View all payments</Link></Button></CardHeader><CardContent>
        {payments.error ? <QueryError error={payments.error} retry={() => void payments.refetch()} label="payment records" /> : payments.isLoading ? <Skeleton className="h-40" /> : !payments.data?.data.length ? <p className="text-sm text-muted-foreground">No payment records yet.</p> : <ul className="divide-y">{payments.data.data.map(payment => <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0 flex-1"><Link className="block truncate text-sm font-medium hover:text-primary" href={`/billing/payments?q=${encodeURIComponent(payment.reference)}`}>{payment.reference}</Link><p className="truncate text-xs text-muted-foreground">{payment.organization?.name ?? 'Organization unavailable'}</p><Timestamp value={payment.created_at} /></div><div className="space-y-1 text-right"><p className="text-sm font-semibold tabular-nums">{amount(payment.amount, payment.currency)}</p><StatusBadge status={payment.status} /></div></li>)}</ul>}
      </CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle className="text-base">Recent invoices</CardTitle><Button variant="ghost" size="sm" asChild><Link href="/billing/invoices">View all invoices</Link></Button></CardHeader><CardContent>
        {invoices.error ? <QueryError error={invoices.error} retry={() => void invoices.refetch()} label="invoice records" /> : invoices.isLoading ? <Skeleton className="h-40" /> : !invoices.data?.data.length ? <p className="text-sm text-muted-foreground">No invoices yet.</p> : <ul className="divide-y">{invoices.data.data.map(invoice => <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{invoice.invoice_number}</p><p className="truncate text-xs text-muted-foreground">{invoice.organization?.name ?? 'Organization unavailable'}</p><Timestamp value={invoice.created_at} /></div><StatusBadge status={invoice.status} /></li>)}</ul>}
      </CardContent></Card>
    </div>
  </BillingWorkspace>
}
