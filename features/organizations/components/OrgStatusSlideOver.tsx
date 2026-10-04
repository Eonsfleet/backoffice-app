'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { SlideOver } from '@/components/shared/SlideOver'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { setOrganizationStatus } from '@/features/organizations/api'
import type { Organization } from '@/types/api'

type Status = 'active' | 'inactive' | 'suspended'

export function OrgStatusSlideOver({ org, open, onOpenChange }: {
  org: Organization | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!org || !open) return null
  return <OrgStatusForm org={org} onOpenChange={onOpenChange} />
}

function OrgStatusForm({ org, onOpenChange }: { org: Organization; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient()
  const [status, setStatus] = useState<Status>(org.status === 'inactive' || org.status === 'suspended' ? org.status : 'active')
  const mutation = useMutation({
    mutationFn: () => setOrganizationStatus(org!.id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['organizations'] })
      void qc.invalidateQueries({ queryKey: ['organization'] })
      void qc.invalidateQueries({ queryKey: ['org-activity'] })
      toast.success('Organization status updated')
      onOpenChange(false)
    },
  })
  const message = (mutation.error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message
  return <SlideOver open onOpenChange={next => { if (!mutation.isPending) onOpenChange(next) }} title="Change organization status" description={org.name} width="md">
    <form className="space-y-5 px-5" onSubmit={event => { event.preventDefault(); mutation.mutate() }}>
      <div className="flex items-center gap-3 text-sm"><span>Current status</span><StatusBadge status={org?.status ?? 'Not set'} /></div>
      <div className="space-y-2">
        <Label htmlFor="organization-new-status">New status</Label>
        <select id="organization-new-status" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={status} disabled={mutation.isPending} onChange={event => setStatus(event.target.value as Status)}>
          <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
        </select>
        <p className="text-xs text-muted-foreground">Changes the organization account status. The subscription status is managed from Subscriptions.</p>
      </div>
      {mutation.isError && <p role="alert" className="text-sm text-destructive">{message ?? 'Could not update the organization status. Try again.'}</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" type="button" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={!org || mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save status'}</Button></div>
    </form>
  </SlideOver>
}
