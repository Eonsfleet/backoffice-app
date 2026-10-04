'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, type DataTableProps } from './DataTable'
import { ConfirmDialog } from './ConfirmDialog'
import { Button } from '@/components/ui/button'

export interface BulkAction {
  label: string
  description: string
  run: (ids: Array<string | number>) => Promise<unknown>
  variant?: 'destructive' | 'default'
}

interface Props<T> extends DataTableProps<T> {
  selectionScope: string
  actions: BulkAction[]
  invalidateKeys: string[]
}

export function BulkRecordsTable<T extends { id: string | number }>({ selectionScope, ...props }: Props<T>) {
  // Reset selection when the page, filters or record view changes.
  return <SelectableTable key={selectionScope} {...props} />
}

function SelectableTable<T extends { id: string | number }>({ actions, invalidateKeys, ...props }: Omit<Props<T>, 'selectionScope'>) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<string[]>([])
  const [confirmation, setConfirmation] = useState<{ action: BulkAction; ids: Array<string | number> } | null>(null)
  const ids = props.data.filter(record => selected.includes(String(record.id))).map(record => record.id)
  const busy = !!(props.isLoading || props.isFetching || props.error || confirmation)
  const selection: ColumnDef<T, unknown> = {
    id: 'selection', enableSorting: false, enableHiding: false,
    header: () => <label className="flex min-h-11 min-w-11 items-center justify-center"><input type="checkbox" aria-label="Select all records on this page" checked={props.data.length > 0 && ids.length === props.data.length} disabled={busy || !props.data.length} onChange={event => setSelected(event.target.checked ? props.data.map(record => String(record.id)) : [])} className="h-4 w-4 accent-primary" /></label>,
    cell: ({ row }) => <label className="flex min-h-11 min-w-11 items-center justify-center"><input type="checkbox" aria-label={`Select record ${row.original.id}`} checked={selected.includes(String(row.original.id))} disabled={busy} onChange={event => setSelected(previous => event.target.checked ? [...previous, String(row.original.id)] : previous.filter(id => id !== String(row.original.id)))} className="h-4 w-4 accent-primary" /></label>,
  }
  return <div className="space-y-3">
    {actions.length > 0 && <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
      <p role="status" className="text-sm text-muted-foreground">{ids.length} selected on this page</p>
      {actions.map(action => <Button key={action.label} variant={action.variant ?? 'destructive'} size="sm" disabled={busy || !ids.length} onClick={() => setConfirmation({ action, ids: [...ids] })}>{action.label}</Button>)}
      {ids.length > 0 && <Button variant="ghost" size="sm" disabled={busy} onClick={() => setSelected([])}>Clear selection</Button>}
    </div>}
    <DataTable {...props} columns={actions.length ? [selection, ...props.columns] : props.columns} />
    {confirmation && <ConfirmDialog open onOpenChange={open => { if (!open) setConfirmation(null) }} title={`${confirmation.action.label}: ${confirmation.ids.length} record${confirmation.ids.length === 1 ? '' : 's'}`} description={confirmation.action.description} confirmLabel={confirmation.action.label} variant={confirmation.action.variant ?? 'destructive'} onConfirm={async () => {
      try {
        await confirmation.action.run(confirmation.ids)
      } catch (error) {
        const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
        toast.error(message ?? 'The selected records could not be changed.')
        throw error
      }
      setSelected([])
      await Promise.all(invalidateKeys.map(key => qc.invalidateQueries({ queryKey: [key] })))
      toast.success(`${confirmation.action.label} completed`)
    }} />}
  </div>
}
