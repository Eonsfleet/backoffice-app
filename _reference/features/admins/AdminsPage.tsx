import { useState } from 'react'
import { useAdmins, useCreateAdmin, useDeleteAdmin } from './hooks'
import { AdminForm } from './AdminForm'
import { DataTable } from '@/components/shared/DataTable'
import { PageError } from '@/components/shared/PageError'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Can } from '@/components/shared/Can'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'
import type { AdminUser } from '@/types'
import type { ColumnDef } from '@tanstack/react-table'

const roleColors: Record<string, string> = {
    super_admin: 'bg-red-100 text-red-800',
    support: 'bg-blue-100 text-blue-800',
    installer: 'bg-green-100 text-green-800',
}

export default function AdminsPage() {
    const [page] = useState(1)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)

    const { data, isLoading, isError } = useAdmins(page)
    const createAdmin = useCreateAdmin()
    const deleteAdmin = useDeleteAdmin()

    const columns: ColumnDef<AdminUser, any>[] = [
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'email', header: 'Email' },
        {
            accessorKey: 'role',
            header: 'Role',
            cell: ({ row }) => {
                const role = row.original.role
                return <Badge className={roleColors[role] || 'bg-gray-100'}>{role}</Badge>
            }
        },
        { accessorKey: 'last_login', header: 'Last Login' },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">Edit</Button>
                    <Can permission="manage_admins">
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.original.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </Can>
                </div>
            )
        }
    ]

    if (isError) return <PageError message="Failed to load admin users." />

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Admin Users</h1>
                <Can permission="manage_admins">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> Add Admin</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Admin User</DialogTitle>
                            </DialogHeader>
                            <AdminForm
                                onSubmit={(formData) => {
                                    createAdmin.mutate(formData, {
                                        onSuccess: () => setIsDialogOpen(false)
                                    })
                                }}
                                isSubmitting={createAdmin.isPending}
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
                title="Delete Admin"
                description="Are you sure? This action cannot be undone and will revoke all access for this user."
                onConfirm={() => {
                    if (deleteId) {
                        deleteAdmin.mutate(deleteId, {
                            onSettled: () => setDeleteId(null)
                        })
                    }
                }}
            />
        </div>
    )
}
