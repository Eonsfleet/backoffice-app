import type { Organization } from '@/types/api'

export function accountSignals(org: Organization): string[] {
  const signals: string[] = []
  if (['suspended', 'expired', 'restricted', 'grace'].includes(org.status)) signals.push(`Account ${org.status}`)
  if (org.current_plan && ['expired', 'suspended', 'restricted', 'grace'].includes(org.current_plan.status)) signals.push(`Subscription ${org.current_plan.status}`)
  const assets = org.total_vehicles ?? org.vehicle_count
  const limit = org.current_plan?.plan.vehicle_limit
  if (assets !== undefined && limit != null && limit > 0 && assets / limit >= 0.9) signals.push(`${assets} of ${limit} asset slots used`)
  return signals
}
