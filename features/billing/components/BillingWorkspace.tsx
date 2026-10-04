'use client'

import { CommercialWorkspace, type CommercialWorkspaceProps } from '@/components/shared/CommercialWorkspace'

export function BillingWorkspace(props: CommercialWorkspaceProps) {
  return <CommercialWorkspace area="billing" {...props} />
}
