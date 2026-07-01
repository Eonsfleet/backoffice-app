'use client'

import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { getInitials } from '@/lib/string-utils'
import { getUserActivityLog, exportUserActivityLog } from '@/features/users/api'
import type { ActivityLogEntry } from '@/features/users/api'
import type { TenantUser } from '@/types/api'

export type { ActivityLogEntry }

// ─── Personal Data ────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="w-36 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 break-all text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function PersonalDataTab({ user }: { user: TenantUser }) {
  return (
    <div className="space-y-1">
      <Row label="Full Name"      value={user.name} />
      <Row label="Email"          value={user.email} />
      <Row label="Phone"          value={user.phone ?? '—'} />
      <Row label="Role"           value={user.role ?? '—'} />
      <Row label="Organization"   value={user.organization?.name ?? '—'} />
      <Row label="Employee No."   value={user.employee_number ?? '—'} />
      <Row label="Date of Birth"  value={user.date_of_birth ? format(new Date(user.date_of_birth), 'MMM d, yyyy') : '—'} />
      <Row label="Status"         value={<StatusBadge status={user.status} />} />
      <Row label="Email Verified" value={user.email_verified_at ? format(new Date(user.email_verified_at), 'MMM d, yyyy') : 'Not verified'} />
      <Row label="Last Login"     value={user.last_login ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true }) : 'Never'} />
      <Row label="Joined"         value={format(new Date(user.created_at), 'MMM d, yyyy')} />
    </div>
  )
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  created: 'text-emerald-600 bg-emerald-50',
  updated: 'text-blue-600 bg-blue-50',
  deleted: 'text-red-600 bg-red-50',
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? 'text-muted-foreground bg-muted'
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {action}
    </span>
  )
}

function ActivityLogTab({ userId }: { userId: string | number }) {
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-activity-log', userId, page],
    queryFn: () => getUserActivityLog(userId, { page, per_page: 25 }),
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportUserActivityLog(userId)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.meta.total} total events` : ''}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting || !data?.data.length}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive text-center py-6">Failed to load activity log.</p>
      )}

      {data && !isLoading && (
        <>
          {data.data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No activity recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {data.data.map((entry) => (
                <div key={entry.id} className="rounded-md border border-border/60 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ActionBadge action={entry.action} />
                      <span className="font-medium text-foreground">{entry.resource_type}</span>
                      {entry.resource_id && (
                        <span className="text-xs text-muted-foreground">#{entry.resource_id}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                      {entry.changed_at ? formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true }) : '—'}
                    </span>
                  </div>
                  {entry.description && (
                    <p className="mt-1 text-muted-foreground text-xs">{entry.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {data.meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {data.meta.last_page}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page >= data.meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UserDetail({ user }: { user: TenantUser }) {
  const initials = getInitials(user.name)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          {user.avatar && <AvatarImage src={user.avatar} />}
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-semibold text-foreground leading-tight">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <StatusBadge status={user.status} className="mt-1.5" />
        </div>
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="w-full">
          <TabsTrigger value="personal" className="flex-1">Personal Data</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <PersonalDataTab user={user} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityLogTab userId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
