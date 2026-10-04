'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Progress header for multi-step forms. `current` is 1-based. */
export function StepIndicator({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
      {steps.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
              done && 'border-primary bg-primary text-primary-foreground',
              active && 'border-primary text-primary',
              !done && !active && 'border-border text-muted-foreground',
            )}>
              {done ? <Check className="h-3.5 w-3.5" /> : n}
            </span>
            <span className={cn('truncate', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>{label}</span>
            {n < steps.length && <span className="h-px flex-1 bg-border" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}
