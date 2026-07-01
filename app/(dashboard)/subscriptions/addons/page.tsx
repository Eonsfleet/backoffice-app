'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PlusCircle, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SlideOver } from '@/components/shared/SlideOver'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { listAddons, createAddon, updateAddon, deleteAddon } from '@/features/subscriptions/api'
import type { Addon } from '@/types/api'

const schema = z.object({
  name:        z.string().min(1, 'Name is required'),
  price:       z.number().min(0),
  module:      z.string().min(1, 'Module key is required'),
  description: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function fmt(v: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(v)
}

function AddonForm({ addon, onSubmit, isPending, onCancel }: {
  addon?: Addon | null
  onSubmit: (v: FormValues) => void
  isPending: boolean
  onCancel: () => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        addon?.name        ?? '',
      price:       addon?.price       ?? 0,
      module:      addon?.module      ?? '',
      description: addon?.description ?? '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-5">
      <div className="space-y-1.5">
        <Label>Name *</Label>
        <Input {...register('name')} placeholder="e.g. Fuel Monitoring" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Price (₦) *</Label>
        <Input {...register('price', { valueAsNumber: true })} type="number" min={0} placeholder="5000" />
        {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Module Key *</Label>
        <Input {...register('module')} placeholder="e.g. fuel_monitoring" />
        {errors.module && <p className="text-xs text-destructive">{errors.module.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="What does this add-on include?"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {addon ? 'Save Changes' : 'Create Add-on'}
        </Button>
      </div>
    </form>
  )
}

export default function AddonsPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]         = useState(false)
  const [editAddon, setEditAddon]       = useState<Addon | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Addon | null>(null)

  const { data: addons, isLoading } = useQuery({
    queryKey: ['addons'],
    queryFn: listAddons,
    staleTime: 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: (v: FormValues) =>
      editAddon ? updateAddon(editAddon.id, v) : createAddon(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addons'] })
      toast.success(editAddon ? 'Add-on updated' : 'Add-on created')
      setFormOpen(false); setEditAddon(null)
    },
    onError: () => toast.error('Failed to save add-on'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteAddon(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addons'] })
      toast.success('Add-on deleted')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Failed to delete add-on'),
  })

  const openCreate = () => { setEditAddon(null); setFormOpen(true) }
  const openEdit   = (a: Addon) => { setEditAddon(a); setFormOpen(true) }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add-ons"
        description={addons ? `${addons.length} add-ons` : 'Optional feature extensions'}
        icon={PlusCircle}
        actions={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Add-on</Button>}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : !addons?.length ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
          <PlusCircle className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No add-ons yet.</p>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Add-on</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addons.map((addon) => (
            <Card key={addon.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <p className="font-semibold text-foreground">{addon.name}</p>
                  <p className="text-lg font-bold text-primary">{fmt(addon.price)}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(addon)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(addon)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              {addon.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{addon.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <SlideOver
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditAddon(null) }}
        title={editAddon ? 'Edit Add-on' : 'New Add-on'}
      >
        <AddonForm
          addon={editAddon}
          onSubmit={(v) => saveMutation.mutate(v)}
          isPending={saveMutation.isPending}
          onCancel={() => setFormOpen(false)}
        />
      </SlideOver>

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="Delete Add-on"
          description={`Permanently delete "${deleteTarget.name}"?`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(deleteTarget.id)}
        />
      )}
    </div>
  )
}
