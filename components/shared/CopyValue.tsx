'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function CopyValue({ value, label = 'identifier' }: { value?: string | number | null; label?: string }) {
  const [copied, setCopied] = useState(false)
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">Unavailable</span>
  const text = String(value)
  return <span className="inline-flex min-w-0 items-center gap-1">
    <span className="break-all font-mono text-xs">{text}</span>
    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Copy ${label}`} onClick={async () => {
      try { await navigator.clipboard.writeText(text); setCopied(true); toast.success(`${label} copied`) }
      catch { toast.error('Could not copy. Select the value and copy it manually.') }
    }}>{copied ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}</Button>
  </span>
}
