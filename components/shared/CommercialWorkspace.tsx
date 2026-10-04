'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Layers, CreditCard } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessNavigation } from '@/lib/navigation'
import { COMMERCIAL_SECTIONS, type CommercialArea } from '@/lib/commercial-navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface CommercialWorkspaceProps {
  title: string
  description: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function CommercialWorkspace({ area, title, description, actions, children }: CommercialWorkspaceProps & { area: CommercialArea }) {
  const pathname = usePathname()
  const user = useAuthStore(state => state.user)
  const isBilling = area === 'billing'
  const Icon = isBilling ? CreditCard : Layers
  const other = COMMERCIAL_SECTIONS[isBilling ? 'subscriptions' : 'billing'][0]
  return <div className="space-y-6">
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Icon aria-hidden="true" className="h-5 w-5 text-primary" /></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{isBilling ? 'Billing & payments' : 'Subscriptions'}</p><h1 className="text-xl font-bold tracking-tight">{title}</h1></div></div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {canAccessNavigation(user, other) && <Button variant="outline" asChild><Link href={other.href}>Open {isBilling ? 'subscriptions' : 'billing & payments'}<ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link></Button>}
        </div>
      </div>
      <nav aria-label={isBilling ? 'Billing & payments sections' : 'Subscription sections'} className="flex flex-wrap gap-1 border-b">
        {COMMERCIAL_SECTIONS[area].filter(item => canAccessNavigation(user, item)).map(({ href, label, icon: SectionIcon }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={cn('flex min-h-11 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium transition-colors hover:bg-muted/50 hover:text-foreground', pathname === href ? 'border-primary text-primary' : 'text-muted-foreground')}><SectionIcon aria-hidden="true" className="h-4 w-4 shrink-0" />{label}</Link>)}
      </nav>
    </div>
    {children}
  </div>
}
