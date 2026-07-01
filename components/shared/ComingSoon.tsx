import { Construction, type LucideIcon } from 'lucide-react'

interface ComingSoonProps {
  title?: string
  description?: string
  phase?: string
  icon?: LucideIcon
  features?: string[]
}

export function ComingSoon({
  title = 'Coming Soon',
  description = 'This module is under active development.',
  phase,
  icon: Icon = Construction,
  features = [],
}: ComingSoonProps) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
        <Icon className="h-8 w-8 text-primary" />
      </div>

      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>

      {phase && (
        <span className="mt-4 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {phase}
        </span>
      )}

      {features.length > 0 && (
        <ul className="mt-6 space-y-2 text-left">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
