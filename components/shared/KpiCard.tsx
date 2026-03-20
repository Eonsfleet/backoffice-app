import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value?: string | number
  icon: LucideIcon
  trend?: number        // percentage change vs last period
  trendLabel?: string   // e.g. "vs last month"
  isLoading?: boolean
  iconClassName?: string
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel = 'vs last month',
  isLoading,
  iconClassName,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const isPositive = trend !== undefined && trend > 0
  const isNegative = trend !== undefined && trend < 0

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {value ?? '—'}
            </p>
            {trend !== undefined && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium',
                isPositive && 'text-emerald-600 dark:text-emerald-400',
                isNegative && 'text-destructive',
                !isPositive && !isNegative && 'text-muted-foreground',
              )}>
                {isPositive ? <TrendingUp className="h-3 w-3" />
                  : isNegative ? <TrendingDown className="h-3 w-3" />
                  : <Minus className="h-3 w-3" />}
                <span>{trend > 0 ? '+' : ''}{trend}% {trendLabel}</span>
              </div>
            )}
          </div>
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10',
            iconClassName,
          )}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
