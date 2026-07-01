'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Settings, User, Shield, Bell, Sliders,
  Monitor, Trash2, KeyRound, ToggleLeft, ToggleRight, Globe,
} from 'lucide-react'
import { format } from 'date-fns'

import { PageHeader } from '@/components/shared/PageHeader'
import { AvatarUpload } from '@/components/shared/AvatarUpload'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api/client'
import { useAuthStore } from '@/stores/auth.store'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name:   z.string().min(2, 'Name must be at least 2 characters'),
  email:  z.string().email('Invalid email address'),
  avatar: z.string().optional(),
})

const passwordSchema = z.object({
  current_password:       z.string().min(1, 'Required'),
  new_password:           z.string().min(8, 'Must be at least 8 characters'),
  new_password_confirmation: z.string().min(8, 'Required'),
}).refine((d) => d.new_password === d.new_password_confirmation, {
  message: 'Passwords do not match',
  path: ['new_password_confirmation'],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

// ─── API helpers ──────────────────────────────────────────────────────────────

const getSessions = async () => {
  const { data } = await api.get('/auth/admin/sessions')
  return data.data as Array<{ id: string; ip: string; user_agent: string; last_active: string; is_current: boolean }>
}

const revokeSession = async (id: string) => {
  await api.delete(`/auth/admin/sessions/${id}`)
}

const getNotificationPrefs = async () => {
  const { data } = await api.get('/admin/settings/notifications')
  return data.data as Record<string, boolean>
}

const updateNotificationPrefs = async (prefs: Record<string, boolean>) => {
  await api.patch('/admin/settings/notifications', prefs)
}

const getPlatformSettings = async () => {
  const { data } = await api.get('/admin/settings/platform')
  return data.data as {
    maintenance_mode: boolean
    feature_flags: Record<string, boolean>
    allowed_domains: string[]
  }
}

const updatePlatformSettings = async (payload: object) => {
  await api.patch('/admin/settings/platform', payload)
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const user    = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const token   = useAuthStore((s) => s.token)

  const [avatar, setAvatar] = useState(user?.avatar ?? '')

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '', avatar: user?.avatar ?? '' },
  })

  const profileMut = useMutation({
    mutationFn: async (values: ProfileForm) => {
      const { data } = await api.patch('/auth/admin/profile', { ...values, avatar })
      return data.data
    },
    onSuccess: (updatedUser) => {
      setAuth(token!, updatedUser)
      toast.success('Profile updated')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  const { register: regPwd, handleSubmit: handlePwd, formState: { errors: pwdErrors }, reset: resetPwd } =
    useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const passwordMut = useMutation({
    mutationFn: async (values: PasswordForm) => {
      await api.patch('/auth/admin/password', values)
    },
    onSuccess: () => {
      toast.success('Password changed')
      resetPwd()
    },
    onError: () => toast.error('Failed to change password'),
  })

  return (
    <div className="space-y-6">
      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Information</CardTitle>
          <CardDescription>Update your display name, email, and avatar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => profileMut.mutate(v))} className="space-y-5">
            <div className="flex items-center gap-5">
              <AvatarUpload
                value={avatar}
                name={user?.name}
                onChange={(url) => setAvatar(url)}
                size="lg"
              />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{user?.name}</p>
                <p>{user?.email}</p>
                <p className="capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            <Button type="submit" disabled={profileMut.isPending || (!isDirty && avatar === user?.avatar)}>
              {profileMut.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePwd((v) => passwordMut.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current_password">Current Password</Label>
              <Input id="current_password" type="password" {...regPwd('current_password')} />
              {pwdErrors.current_password && <p className="text-xs text-destructive">{pwdErrors.current_password.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new_password">New Password</Label>
                <Input id="new_password" type="password" {...regPwd('new_password')} />
                {pwdErrors.new_password && <p className="text-xs text-destructive">{pwdErrors.new_password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input id="confirm_password" type="password" {...regPwd('new_password_confirmation')} />
                {pwdErrors.new_password_confirmation && (
                  <p className="text-xs text-destructive">{pwdErrors.new_password_confirmation.message}</p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={passwordMut.isPending}>
              {passwordMut.isPending ? 'Updating…' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const qc = useQueryClient()

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: getSessions,
    staleTime: 30_000,
  })

  const revokeMut = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      toast.success('Session revoked')
      qc.invalidateQueries({ queryKey: ['admin-sessions'] })
    },
    onError: () => toast.error('Failed to revoke session'),
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4" /> Active Sessions
          </CardTitle>
          <CardDescription>Manage all active login sessions across devices.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : sessions && sessions.length > 0 ? (
            <ul className="divide-y divide-border">
              {sessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{session.user_agent}</p>
                      {session.is_current && <Badge variant="secondary" className="text-[10px]">Current</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.ip} · Last active {format(new Date(session.last_active), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => revokeMut.mutate(session.id)}
                      disabled={revokeMut.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No active sessions found.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">Authenticator App</p>
              <p className="text-xs text-muted-foreground mt-0.5">Use an authenticator app to generate one-time codes.</p>
            </div>
            <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

const NOTIFICATION_PREFS = [
  { key: 'new_organization',     label: 'New Organization Registered',  description: 'When a new tenant registers on the platform' },
  { key: 'subscription_expiry',  label: 'Subscription Expiring',        description: 'When a subscription is about to expire' },
  { key: 'payment_failed',       label: 'Payment Failed',               description: 'When a payment attempt fails' },
  { key: 'device_offline',       label: 'Device Offline Alert',         description: 'When a device goes offline for over 24 hours' },
  { key: 'new_admin_user',       label: 'New Admin User Created',       description: 'When a new admin user account is created' },
  { key: 'high_risk_action',     label: 'High-Risk Admin Action',       description: 'When a high or critical risk action is logged' },
]

function NotificationsTab() {
  const qc = useQueryClient()

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: getNotificationPrefs,
    staleTime: 60_000,
  })

  const updateMut = useMutation({
    mutationFn: updateNotificationPrefs,
    onSuccess: () => {
      toast.success('Preferences saved')
      qc.invalidateQueries({ queryKey: ['notification-prefs'] })
    },
    onError: () => toast.error('Failed to save preferences'),
  })

  const toggle = (key: string, current: boolean) => {
    updateMut.mutate({ ...prefs, [key]: !current })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" /> Email Notifications
        </CardTitle>
        <CardDescription>Choose which platform events trigger email notifications.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {NOTIFICATION_PREFS.map((pref) => {
            const enabled = prefs?.[pref.key] ?? false
            return (
              <li key={pref.key} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.description}</p>
                </div>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <button
                    onClick={() => toggle(pref.key, enabled)}
                    disabled={updateMut.isPending}
                    className="shrink-0 transition-opacity disabled:opacity-50"
                    aria-label={`${enabled ? 'Disable' : 'Enable'} ${pref.label}`}
                  >
                    {enabled
                      ? <ToggleRight className="h-6 w-6 text-primary" />
                      : <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                    }
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

// ─── Platform Tab (Superadmin only) ───────────────────────────────────────────

function PlatformTab() {
  const qc = useQueryClient()
  const [newDomain, setNewDomain] = useState('')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: getPlatformSettings,
    staleTime: 60_000,
  })

  const updateMut = useMutation({
    mutationFn: updatePlatformSettings,
    onSuccess: () => {
      toast.success('Platform settings updated')
      qc.invalidateQueries({ queryKey: ['platform-settings'] })
    },
    onError: () => toast.error('Failed to update settings'),
  })

  const toggleMaintenance = () => {
    if (!settings) return
    updateMut.mutate({ maintenance_mode: !settings.maintenance_mode })
  }

  const toggleFlag = (flag: string, current: boolean) => {
    if (!settings) return
    updateMut.mutate({ feature_flags: { ...settings.feature_flags, [flag]: !current } })
  }

  const addDomain = () => {
    if (!newDomain.trim() || !settings) return
    const domains = [...(settings.allowed_domains ?? []), newDomain.trim()]
    updateMut.mutate({ allowed_domains: domains })
    setNewDomain('')
  }

  const removeDomain = (domain: string) => {
    if (!settings) return
    updateMut.mutate({ allowed_domains: settings.allowed_domains.filter((d) => d !== domain) })
  }

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
  }

  return (
    <div className="space-y-6">
      {/* Maintenance mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sliders className="h-4 w-4" /> Maintenance Mode
          </CardTitle>
          <CardDescription>When enabled, the platform shows a maintenance page to all tenants.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {settings?.maintenance_mode ? 'Platform is in maintenance mode' : 'Platform is live'}
              </p>
            </div>
            <button
              onClick={toggleMaintenance}
              disabled={updateMut.isPending}
              aria-label="Toggle maintenance mode"
              className="disabled:opacity-50"
            >
              {settings?.maintenance_mode
                ? <ToggleRight className="h-7 w-7 text-amber-500" />
                : <ToggleLeft className="h-7 w-7 text-muted-foreground" />
              }
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Feature flags */}
      {settings?.feature_flags && Object.keys(settings.feature_flags).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature Flags</CardTitle>
            <CardDescription>Enable or disable platform-level features for all tenants.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {Object.entries(settings.feature_flags).map(([flag, enabled]) => (
                <li key={flag} className="flex items-center justify-between py-3">
                  <span className="text-sm font-mono text-foreground">{flag}</span>
                  <button
                    onClick={() => toggleFlag(flag, enabled)}
                    disabled={updateMut.isPending}
                    aria-label={`Toggle ${flag}`}
                    className="disabled:opacity-50"
                  >
                    {enabled
                      ? <ToggleRight className="h-6 w-6 text-primary" />
                      : <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                    }
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Allowed domains */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> Allowed Domains
          </CardTitle>
          <CardDescription>Restrict tenant sign-up to specific email domains.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. company.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
            />
            <Button onClick={addDomain} disabled={!newDomain.trim() || updateMut.isPending}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings?.allowed_domains?.length === 0 && (
              <p className="text-sm text-muted-foreground">No domain restrictions — all domains allowed.</p>
            )}
            {settings?.allowed_domains?.map((domain) => (
              <Badge key={domain} variant="secondary" className="gap-1.5 pr-1">
                {domain}
                <button onClick={() => removeDomain(domain)} className="ml-1 hover:text-destructive" aria-label={`Remove ${domain}`}>
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, security, notifications, and platform configuration."
        icon={Settings}
      />

      <Tabs defaultValue="profile">
        <TabsList className="mb-2">
          <TabsTrigger value="profile">
            <User className="mr-1.5 h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-1.5 h-3.5 w-3.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-1.5 h-3.5 w-3.5" /> Notifications
          </TabsTrigger>
          <PermissionGate permission="admin.platform.manage" fallback={null}>
            <TabsTrigger value="platform">
              <Sliders className="mr-1.5 h-3.5 w-3.5" /> Platform
            </TabsTrigger>
          </PermissionGate>
        </TabsList>

        <Separator className="mb-6" />

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="platform">
          <PermissionGate permission="admin.platform.manage">
            <PlatformTab />
          </PermissionGate>
        </TabsContent>
      </Tabs>
    </div>
  )
}
