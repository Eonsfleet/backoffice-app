import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
    label: string
    value?: number | string
    icon: LucideIcon
    trend?: string
}

export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
    return (
        <Card>
            <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                    <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-2xl font-bold">{value ?? '—'}</p>
                    {trend && <p className="text-xs text-gray-400">{trend}</p>}
                </div>
            </CardContent>
        </Card>
    )
}
