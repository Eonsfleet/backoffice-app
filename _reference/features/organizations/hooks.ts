import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listOrganizations, createOrganization, deleteOrganization } from '@/api/organizations'
import { toast } from 'sonner'

export function useOrganizations(page: number, q?: string) {
    return useQuery({
        queryKey: ['organizations', page, q],
        queryFn: () => listOrganizations({ page, per_page: 20, q }),
    })
}

export function useCreateOrganization() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: createOrganization,
        onSuccess: () => {
            toast.success('Organization created successfully')
            qc.invalidateQueries({ queryKey: ['organizations'] })
            qc.invalidateQueries({ queryKey: ['dashboard-metrics'] })
        },
        onError: () => toast.error('Failed to create organization'),
    })
}

export function useDeleteOrganization() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: deleteOrganization,
        onSuccess: () => {
            toast.success('Organization deleted successfully')
            qc.invalidateQueries({ queryKey: ['organizations'] })
            qc.invalidateQueries({ queryKey: ['dashboard-metrics'] })
        },
        onError: () => toast.error('Failed to delete organization'),
    })
}
