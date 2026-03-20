'use client'

import { format, formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { TenantUser } from '@/types/api'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1 break-all font-medium text-foreground">{value}</span>
    </div>
  )
}

export function UserDetail({ user }: { user: TenantUser }) {
  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          {user.avatar && <AvatarImage src={user.avatar} />}
          <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <StatusBadge status={user.status} className="mt-1" />
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <Row label="Phone"         value={user.phone ?? '—'} />
        <Row label="Role"          value={user.role ?? '—'} />
        <Row label="Organization"  value={user.organization?.name ?? '—'} />
        <Row label="Joined"        value={format(new Date(user.created_at), 'MMM d, yyyy')} />
        <Row label="Last Login"    value={user.last_login ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true }) : 'Never'} />
        <Row label="Email Verified" value={user.email_verified_at ? format(new Date(user.email_verified_at), 'MMM d, yyyy') : 'Not verified'} />
      </div>
    </div>
  )
}
