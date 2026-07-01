import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listSubscriptions, createPlan, updatePlan, listPlans, listFeatures, listAddons } from '@/api/subscriptions'
import { toast } from 'sonner'
import type { Plan } from '@/types'

export function useSubscriptions(page: number, q?: string, status?: string) {
    return useQuery({
        queryKey: ['subscriptions', page, q, status],
        queryFn: () => listSubscriptions({ page, per_page: 20, q, status }),
    })
}

export function usePlans() {
    return useQuery({
        queryKey: ['plans'],
        queryFn: listPlans,
    })
}

export function useFeatures() {
    return useQuery({
        queryKey: ['features'],
        queryFn: listFeatures,
    })
}

export function useAddons() {
    return useQuery({
        queryKey: ['addons'],
        queryFn: listAddons,
    })
}

export function useCreatePlan() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: createPlan,
        onSuccess: () => {
            toast.success('Plan created')
            qc.invalidateQueries({ queryKey: ['plans'] })
        },
        onError: () => toast.error('Failed to create plan'),
    })
}

export function useUpdatePlan() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<Plan> }) => updatePlan(id, payload),
        onSuccess: () => {
            toast.success('Plan updated')
            qc.invalidateQueries({ queryKey: ['plans'] })
        },
        onError: () => toast.error('Failed to update plan'),
    })
}
