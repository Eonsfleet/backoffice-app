'use client'

import { useEffect, useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { FileText, Pencil, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { listNotificationTemplates, updateNotificationTemplate, resetNotificationTemplate, type NotificationTemplate, type NotificationType } from '../api'
import { useUrlListState } from '@/hooks/useUrlListState'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { FilterBar } from '@/components/shared/FilterBar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CopyValue } from '@/components/shared/CopyValue'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

type Row = NotificationTemplate & { type: NotificationType }

function TemplateEditor({ record, onClose }: { record: Row; onClose: () => void }) {
  const qc = useQueryClient()
  const id = useId()
  const [subject, setSubject] = useState(record.subject ?? '')
  const [body, setBody] = useState(record.body)
  const [discard, setDiscard] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const dirty = subject !== (record.subject ?? '') || body !== record.body
  const subjectError = subject.length > 255 ? 'Subject must contain 255 characters or fewer.' : undefined
  const bodyError = !body.trim() ? 'Enter template body text.' : body.length > 20_000 ? 'Body must contain 20,000 characters or fewer.' : undefined
  const mutation = useMutation({ mutationFn: () => updateNotificationTemplate(record.id, { subject: subject || null, body }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['notification-templates'] }); toast.success('Template saved'); onClose() } })
  useEffect(() => {
    if (!dirty) return
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty])
  const close = () => { if (mutation.isPending) return; if (dirty) setDiscard(true); else onClose() }
  return <>
    <Sheet open onOpenChange={open => { if (!open) close() }}><SheetContent className="w-full overflow-y-auto sm:max-w-xl">
      <SheetHeader><SheetTitle>Edit notification template</SheetTitle><SheetDescription>{record.type.name} · {record.channel}. Changes are retained across catalogue deployments.</SheetDescription></SheetHeader>
      <form className="space-y-5 px-4 pb-6" onSubmit={event => { event.preventDefault(); setSubmitted(true); if (!subjectError && !bodyError) mutation.mutate() }}>
        <CopyValue value={record.id} label="Template ID" />
        <div><label htmlFor={`${id}-subject`} className="mb-2 block text-sm font-medium">Subject (optional)</label><Input id={`${id}-subject`} value={subject} onChange={event => setSubject(event.target.value)} aria-invalid={submitted && !!subjectError} aria-describedby={submitted && subjectError ? `${id}-subject-error` : undefined} disabled={mutation.isPending} />{submitted && subjectError && <p id={`${id}-subject-error`} role="alert" className="mt-1 text-sm text-status-error">{subjectError}</p>}</div>
        <div><label htmlFor={`${id}-body`} className="mb-2 block text-sm font-medium">Body (required)</label><Textarea id={`${id}-body`} value={body} onChange={event => setBody(event.target.value)} rows={14} required aria-invalid={submitted && !!bodyError} aria-describedby={`${id}-body-help${submitted && bodyError ? ` ${id}-body-error` : ''}`} disabled={mutation.isPending} className="font-mono text-sm" /><p id={`${id}-body-help`} className="mt-2 text-xs text-muted-foreground">Keep existing placeholders such as {'{{vehicle_name}}'} intact. Template content is displayed as text.</p>{submitted && bodyError && <p id={`${id}-body-error`} role="alert" className="mt-1 text-sm text-status-error">{bodyError}</p>}</div>
        {mutation.isError && <p role="alert" className="rounded-md border border-status-error/30 bg-status-error-surface p-3 text-sm text-status-error">Could not save the template. Your changes are preserved; check your permissions or try again.</p>}
        <div className="flex gap-2"><Button type="submit" disabled={mutation.isPending || !dirty}>{mutation.isPending ? 'Saving…' : 'Save template'}</Button><Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}>Cancel</Button></div>
      </form>
    </SheetContent></Sheet>
    <ConfirmDialog open={discard} onOpenChange={setDiscard} title="Discard template changes?" description="Your unsaved subject and body changes will be lost." confirmLabel="Discard changes" onConfirm={onClose} />
  </>
}

export function NotificationTemplatesWorkspace() {
  const qc = useQueryClient()
  const state = useUrlListState()
  const [edit, setEdit] = useState<Row | null>(null)
  const [reset, setReset] = useState<Row | null>(null)
  const query = useQuery({ queryKey: ['notification-templates'], queryFn: ({ signal }) => listNotificationTemplates(signal), staleTime: 60_000 })
  const resetMutation = useMutation({ mutationFn: (id: number) => resetNotificationTemplate(id), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['notification-templates'] }); setReset(null); toast.success('Template marked for restoration on the next catalogue sync') } })
  const categories = [...new Set(query.data?.map(type => type.category) ?? [])].sort()
  const rows = (query.data ?? []).flatMap(type => type.templates.map(template => ({ ...template, type }))).filter(row => (state.status === 'all' || row.type.category === state.status) && `${row.type.name} ${row.type.code} ${row.subject ?? ''} ${row.channel}`.toLowerCase().includes(state.search.toLowerCase()))
  const pageCount = Math.max(1, Math.ceil(rows.length / 20))
  const page = Math.min(state.page, pageCount)
  const columns: ColumnDef<Row, unknown>[] = [
    { id: 'name', accessorFn: row => row.type.name, header: 'Notification', cell: ({ row }) => <div className="max-w-72 whitespace-normal"><p className="font-medium">{row.original.type.name}</p><p className="break-all text-xs text-muted-foreground">{row.original.type.code}</p></div> },
    { accessorKey: 'channel', header: 'Channel' },
    { id: 'category', header: 'Category', cell: ({ row }) => <span className="capitalize">{row.original.type.category.replace(/_/g, ' ')}</span> },
    { id: 'wording', header: 'Wording', cell: ({ row }) => <StatusBadge status={row.original.edited ? 'Customized' : 'Catalogue'} variant={row.original.edited ? 'info' : 'neutral'} /> },
    { id: 'subject', header: 'Subject', cell: ({ row }) => <p className="max-w-80 whitespace-normal break-words text-sm">{row.original.subject || 'No subject'}</p> },
    { id: 'actions', header: 'Actions', enableHiding: false, cell: ({ row }) => <div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => setEdit(row.original)}><Pencil aria-hidden="true" className="mr-1 h-3 w-3" />Edit</Button><Button variant="ghost" size="sm" disabled={!row.original.edited} onClick={() => { resetMutation.reset(); setReset(row.original) }}><RotateCcw aria-hidden="true" className="mr-1 h-3 w-3" />Reset</Button></div> },
  ]
  return <div className="space-y-6"><PageHeader title="Notification templates" icon={FileText} description="Manage platform notification wording by event and channel." /><DataTable caption="Notification templates" data={rows.slice((page - 1) * 20, page * 20)} columns={columns} isLoading={query.isPending} error={query.error} onRetry={() => void query.refetch()} pagination={{ pageIndex: page - 1, pageSize: 20 }} pageCount={pageCount} onPaginationChange={next => state.setPage(next.pageIndex + 1)} toolbar={<FilterBar search={state.search} onSearchChange={state.setSearch} searchLabel="Search notification templates" placeholder="Name, event, subject or channel" filters={state.status !== 'all' ? [{ key: 'category', label: `Category: ${state.status}`, onRemove: () => state.setStatus('all') }] : []} onReset={state.reset}><div><label className="mb-1.5 block text-xs font-medium" id="template-category-label">Category</label><Select value={state.status} onValueChange={state.setStatus}><SelectTrigger aria-labelledby="template-category-label" className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map(category => <SelectItem key={category} value={category}>{category.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div></FilterBar>} />
    {edit && <TemplateEditor key={edit.id} record={edit} onClose={() => setEdit(null)} />}
    {reset && <ConfirmDialog open onOpenChange={open => { if (!open) setReset(null) }} title="Restore catalogue wording?" description={`Mark ${reset.type.name} (${reset.channel}) for restoration on the next catalogue sync. The current wording remains until that sync occurs.`} confirmLabel="Mark for restoration" variant="default" onConfirm={() => resetMutation.mutateAsync(reset.id)} />}
    <p className="text-xs text-muted-foreground">Search, category filtering and pagination operate on the catalogue returned by the API. Reset takes effect on the next catalogue sync.</p>
  </div>
}
