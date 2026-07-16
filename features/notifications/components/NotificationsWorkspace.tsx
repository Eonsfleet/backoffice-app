'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Bell, CheckCheck, Inbox, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AdminNotification,
  type NotificationStatus,
} from '@/features/notifications/api'
import { cn } from '@/lib/utils'

const STATUS_TABS: { value: NotificationStatus; label: string }[] = [
  { value: 'all',    label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read',   label: 'Read' },
]

const SEVERITY_STYLES: Record<string, string> = {
  success:  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning:  'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  error:    'bg-red-500/10 text-red-700 dark:text-red-300',
  critical: 'bg-red-500/10 text-red-700 dark:text-red-300',
  info:     'bg-sky-500/10 text-sky-700 dark:text-sky-300',
}

function NotificationRow({
  notification,
  onMarkRead,
  onDelete,
  busy,
}: {
  notification: AdminNotification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  busy: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{notification.title}</h3>
          {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
          <Badge variant="secondary" className={SEVERITY_STYLES[notification.severity] ?? SEVERITY_STYLES.info}>
            {notification.severity}
          </Badge>
          <Badge variant="outline">{notification.category}</Badge>
        </div>
        {notification.message && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{notification.message}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!notification.is_read && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={busy}
            onClick={() => onMarkRead(notification.id)}
          >
            <CheckCheck className="h-4 w-4" />
            Mark read
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          disabled={busy}
          onClick={() => onDelete(notification.id)}
          aria-label="Delete notification"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<NotificationStatus>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 20

  const queryKey = ['notifications', status, page, perPage]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listNotifications({ page, per_page: perPage, status }),
    staleTime: 20_000,
  })

  const invalidateNotifications = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const markRead = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      invalidateNotifications()
      toast.success('Notification marked as read')
    },
    onError: () => toast.error('Could not update notification'),
  })

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: (count) => {
      invalidateNotifications()
      toast.success(`${count} notification${count === 1 ? '' : 's'} marked as read`)
    },
    onError: () => toast.error('Could not update notifications'),
  })

  const remove = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      invalidateNotifications()
      toast.success('Notification deleted')
    },
    onError: () => toast.error('Could not delete notification'),
  })

  const notifications = useMemo(() => data?.data ?? [], [data?.data])
  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notifications

    return notifications.filter((notification) => [
      notification.title,
      notification.message ?? '',
      notification.category,
      notification.severity,
    ].join(' ').toLowerCase().includes(q))
  }, [notifications, search])

  const unreadOnPage = notifications.filter((notification) => !notification.is_read).length
  const lastPage = data?.meta.last_page ?? 1
  const busy = markRead.isPending || markAllRead.isPending || remove.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Review platform alerts, admin updates, and operational notices."
        icon={Bell}
        actions={
          <Button
            variant="outline"
            className="gap-2"
            disabled={busy || unreadOnPage === 0}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={status}
          onValueChange={(value) => {
            setStatus(value as NotificationStatus)
            setPage(1)
          }}
        >
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notifications"
            className="pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden rounded-lg py-0">
        {isLoading ? (
          <div className="space-y-4 p-4">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              busy={busy}
              onMarkRead={(id) => markRead.mutate(id)}
              onDelete={(id) => remove.mutate(id)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Nothing to show</p>
              <p className="mt-1 text-sm text-muted-foreground">No notifications match the current view.</p>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {lastPage}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= lastPage || isLoading}
            onClick={() => setPage((value) => Math.min(lastPage, value + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
