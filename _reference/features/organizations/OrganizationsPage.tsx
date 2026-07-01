import { useState } from 'react'
import { useOrganizations, useCreateOrganization, useDeleteOrganization } from './hooks'
import { OrganizationsTable } from './OrganizationsTable'
import { OrganizationForm } from './OrganizationForm'
import { PageError } from '@/components/shared/PageError'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

export default function OrganizationsPage() {
    const [page] = useState(1)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const [deleteId, setDeleteId] = useState<number | null>(null)

    const { data, isLoading, isError } = useOrganizations(page)
    const createOrg = useCreateOrganization()
    const deleteOrg = useDeleteOrganization()

    console.log(data)

    if (isError) return <PageError message="Failed to load organizations." />

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Organizations</h1>
                <Can permission="manage_organizations">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> New Organization</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Organization</DialogTitle>
                            </DialogHeader>
                            <OrganizationForm
                                onSubmit={(formData) => {
                                    createOrg.mutate(formData, {
                                        onSuccess: () => setIsDialogOpen(false)
                                    })
                                }}
                                isSubmitting={createOrg.isPending}
                            />
                        </DialogContent>
                    </Dialog>
                </Can>
            </div>
            <OrganizationsTable
                data={data?.data || []}
                isLoading={isLoading}
                onDelete={(id) => setDeleteId(id)}
            />

            <ConfirmDialog
                open={deleteId !== null}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Organization"
                description="Are you sure? This action cannot be undone."
                onConfirm={() => {
                    if (deleteId) {
                        deleteOrg.mutate(deleteId, {
                            onSettled: () => setDeleteId(null)
                        })
                    }
                }}
            />
        </div>
    )
}
