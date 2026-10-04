'use client'

import { CommercialWorkspace, type CommercialWorkspaceProps } from '@/components/shared/CommercialWorkspace'

export function SubscriptionWorkspace(props: CommercialWorkspaceProps) {
  return <CommercialWorkspace area="subscriptions" {...props} />
}
