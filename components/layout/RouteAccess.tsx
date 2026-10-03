'use client'

import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessNavigation, getRouteItem } from '@/lib/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryError } from '@/components/shared/QueryError'

export function RouteAccess({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const user = useAuthStore(s => s.user)
  const loading = useAuthStore(s => s.isBootstrapping)
  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>
  const item = getRouteItem(path)
  if (!user || (item && !canAccessNavigation(user, item))) return <QueryError error={{ response: { status: 403 } }} label={item?.label.toLowerCase() ?? 'this page'} />
  return <div key={path}>{children}</div>
}
