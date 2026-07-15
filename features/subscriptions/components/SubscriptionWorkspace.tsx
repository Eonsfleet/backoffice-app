'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  CreditCard,
  FileText,
  Layers,
  PlusCircle,
  Receipt,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SubscriptionSection = {
  href: string
  label: string
  description: string
  icon: LucideIcon
}

const SECTIONS: SubscriptionSection[] = [
  { href: '/subscriptions', label: 'Overview', description: 'Health and billing signals', icon: CreditCard },
  { href: '/subscriptions/plans', label: 'Plans', description: 'Pricing and limits', icon: Layers },
  { href: '/subscriptions/subscribers', label: 'Subscribers', description: 'Organizations and renewals', icon: Users },
  { href: '/subscriptions/transactions', label: 'Transactions', description: 'Payment history', icon: Receipt },
  { href: '/subscriptions/invoices', label: 'Invoices', description: 'Billing documents', icon: FileText },
  { href: '/subscriptions/analytics', label: 'Analytics', description: 'MRR and churn', icon: BarChart3 },
  { href: '/subscriptions/addons', label: 'Add-ons', description: 'Optional modules', icon: PlusCircle },
]

interface SubscriptionWorkspaceProps {
  title: string
  description: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function SubscriptionWorkspace({ title, description, actions, children }: SubscriptionWorkspaceProps) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Subscriptions</p>
                <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
              </div>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>

        <div className="overflow-x-auto border-b">
          <nav className="flex min-w-max gap-1">
            {SECTIONS.map(({ href, label, description, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 border-b-2 border-transparent px-3 py-3 text-left transition-colors hover:text-foreground',
                    active ? 'border-primary text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="leading-tight">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="hidden text-[11px] text-muted-foreground xl:block">{description}</span>
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {children}
    </div>
  )
}
