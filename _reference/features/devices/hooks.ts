import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listDevices, createDevice, updateDevice, deleteDevice } from '@/api/devices'
import { toast } from 'sonner'
import type { Device } from '@/types'

export function useDevices(page: number, q?: string) {
    return useQuery({
        queryKey: ['devices', page, q],
        queryFn: () => listDevices({ page, per_page: 20, q }),
    })
}

export function useCreateDevice() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: createDevice,
        onSuccess: () => {
            toast.success('Device created successfully')
            qc.invalidateQueries({ queryKey: ['devices'] })
        },
        onError: () => toast.error('Failed to create device'),
    })
}

export function useUpdateDevice() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<Device> }) => updateDevice(id, payload),
        onSuccess: () => {
            toast.success('Device updated successfully')
            qc.invalidateQueries({ queryKey: ['devices'] })
        },
        onError: () => toast.error('Failed to update device'),
    })
}

export function useDeleteDevice() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: deleteDevice,
        onSuccess: () => {
            toast.success('Device deleted successfully')
            qc.invalidateQueries({ queryKey: ['devices'] })
        },
        onError: () => toast.error('Failed to delete device'),
    })
}
