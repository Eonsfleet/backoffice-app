'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function QueryError({ error, retry, label = 'this information' }: { error: unknown; retry?: () => void; label?: string }) {
  const status = (error as { response?: { status?: number } })?.response?.status
  return <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
    <div className="flex-1 text-sm"><p className="font-medium">{status === 403 ? `You do not have permission to view ${label}.` : status === 401 ? 'Your session could not be verified.' : `Could not load ${label}.`}</p>
      <p className="mt-1 text-xs text-muted-foreground">{status === 403 ? 'Contact an administrator if you need access.' : 'Try again. If the issue continues, contact your platform administrator.'}</p>
    </div>{retry && status !== 403 && <Button size="sm" variant="outline" onClick={retry}>Retry</Button>}
  </div>
}
