import { useState } from 'react'
import { useDevices, useCreateDevice, useDeleteDevice } from './hooks'
import { DeviceForm } from './DeviceForm'
import { DataTable } from '@/components/shared/DataTable'
import { PageError } from '@/components/shared/PageError'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Can } from '@/components/shared/Can'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'
import type { Device } from '@/types'
import type { ColumnDef } from '@tanstack/react-table'

export default function DevicesPage() {
    const [page] = useState(1)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)

    const { data, isLoading, isError } = useDevices(page)
    const createDevice = useCreateDevice()
    const deleteDevice = useDeleteDevice()

    const columns: ColumnDef<Device, any>[] = [
        { accessorKey: 'imei', header: 'IMEI' },
        { accessorKey: 'serial_number', header: 'Serial Number' },
        { accessorKey: 'hardware.model', header: 'Hardware Model' },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status
                const isOnline = status === 'online'
                return (
                    <Badge className={isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {status}
                    </Badge>
                )
            }
        },
        { accessorKey: 'organization.name', header: 'Organization' },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">View</Button>
                    <Can permission="manage_devices">
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.original.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </Can>
                </div>
            )
        }
    ]

    if (isError) return <PageError message="Failed to load devices." />

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Devices</h1>
                <Can permission="manage_devices">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> Register Device</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Register Device</DialogTitle>
                            </DialogHeader>
                            <DeviceForm
                                onSubmit={(formData) => {
                                    createDevice.mutate(formData, {
                                        onSuccess: () => setIsDialogOpen(false)
                                    })
                                }}
                                isSubmitting={createDevice.isPending}
                            />
                        </DialogContent>
                    </Dialog>
                </Can>
            </div>
            <DataTable
                columns={columns}
                data={data?.data || []}
                isLoading={isLoading}
            />

            <ConfirmDialog
                open={deleteId !== null}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Device"
                description="Are you sure? This action cannot be undone and will detach the device from its current vehicle."
                onConfirm={() => {
                    if (deleteId) {
                        deleteDevice.mutate(deleteId, {
                            onSettled: () => setDeleteId(null)
                        })
                    }
                }}
            />
        </div>
    )
}
