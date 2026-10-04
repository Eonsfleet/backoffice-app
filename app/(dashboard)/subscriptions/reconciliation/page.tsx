import { redirect } from 'next/navigation'
import { legacyBillingDestination } from '@/lib/commercial-navigation'

export default async function LegacyBillingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(legacyBillingDestination('/subscriptions/reconciliation', await searchParams))
}