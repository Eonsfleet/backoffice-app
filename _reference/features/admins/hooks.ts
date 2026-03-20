import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/api/admins'
import { toast } from 'sonner'
import type { AdminUser } from '@/types'

export function useAdmins(page: number, q?: string) {
    return useQuery({
        queryKey: ['admins', page, q],
        queryFn: () => listAdmins({ page, per_page: 20, q }),
    })
}

export function useCreateAdmin() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: createAdmin,
        onSuccess: () => {
            toast.success('Admin user created successfully')
            qc.invalidateQueries({ queryKey: ['admins'] })
        },
        onError: () => toast.error('Failed to create admin user'),
    })
}

export function useUpdateAdmin() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminUser> }) => updateAdmin(id, payload),
        onSuccess: () => {
            toast.success('Admin user updated successfully')
            qc.invalidateQueries({ queryKey: ['admins'] })
        },
        onError: () => toast.error('Failed to update admin user'),
    })
}

export function useDeleteAdmin() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: deleteAdmin,
        onSuccess: () => {
            toast.success('Admin user deleted successfully')
            qc.invalidateQueries({ queryKey: ['admins'] })
        },
        onError: () => toast.error('Failed to delete admin user'),
    })
}
