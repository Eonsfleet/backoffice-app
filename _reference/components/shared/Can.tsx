import { usePermission } from '@/hooks/usePermission'

interface CanProps {
    permission: Parameters<ReturnType<typeof usePermission>['can']>[0]
    children: React.ReactNode
    fallback?: React.ReactNode
}

export function Can({ permission, children, fallback = null }: CanProps) {
    const { can } = usePermission()
    return can(permission) ? <>{children}</> : <>{fallback}</>
}
