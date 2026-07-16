'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Settings, User, Shield, Bell, Sliders,
  Monitor, Trash2, KeyRound, Globe, Mail, Smartphone, Lock,
  Save, Plus, X, CheckCircle2, AlertTriangle, Loader2,
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
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import {
  getAdminSessions,
  revokeAdminSession,
  updateAdminPassword,
  updateAdminProfile,
  type AdminSession,
} from '@/features/auth/api'

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

function SettingCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="border-b border-border/70 bg-muted/20 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const getSessions = async () => {
  return getAdminSessions()
}

const revokeSession = async (id: string) => {
  await revokeAdminSession(id)
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

  const [avatar, setAvatar] = useState<string | null>(null)
  const currentAvatar = avatar ?? user?.avatar ?? ''

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '', avatar: user?.avatar ?? '' },
  })

  useEffect(() => {
    reset({ name: user?.name ?? '', email: user?.email ?? '', avatar: user?.avatar ?? '' })
  }, [reset, user])

  const profileMut = useMutation({
    mutationFn: async (values: ProfileForm) => {
      return updateAdminProfile({ ...values, avatar: currentAvatar || null })
    },
    onSuccess: (updatedUser) => {
      setAuth(token!, updatedUser)
      reset({ name: updatedUser.name, email: updatedUser.email, avatar: updatedUser.avatar ?? '' })
      setAvatar(null)
      toast.success('Profile updated')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  const { register: regPwd, handleSubmit: handlePwd, formState: { errors: pwdErrors }, reset: resetPwd } =
    useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const passwordMut = useMutation({
    mutationFn: async (values: PasswordForm) => {
      await updateAdminPassword(values)
    },
    onSuccess: () => {
      toast.success('Password changed')
      resetPwd()
    },
    onError: () => toast.error('Failed to change password'),
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="overflow-hidden">
          <CardContent className="pt-5">
            <div className="flex flex-col items-center text-center">
              <AvatarUpload
                value={currentAvatar}
                name={user?.name}
                onChange={(url) => setAvatar(url)}
                size="lg"
              />
              <h2 className="mt-4 text-lg font-semibold">{user?.name ?? 'Admin user'}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-3 rounded-md capitalize">
                {user?.role?.replace('_', ' ') ?? 'admin'}
              </Badge>
            </div>

            <Separator className="my-5" />

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> Email
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4" /> Access level
                </span>
                <span className="font-medium capitalize">{user?.role?.replace('_', ' ') ?? 'admin'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <SettingCard
          icon={User}
          title="Profile Information"
          description="Keep your backoffice identity and contact details up to date."
        >
          <form onSubmit={handleSubmit((v) => profileMut.mutate(v))} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...register('name')} />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...register('email')} />
                <FieldError message={errors.email?.message} />
              </div>
            </div>

            <Button type="submit" disabled={profileMut.isPending || (!isDirty && currentAvatar === (user?.avatar ?? ''))}>
              {profileMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {profileMut.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </SettingCard>
      </div>

      {/* Password */}
      <SettingCard
        icon={KeyRound}
        title="Change Password"
        description="Use a strong password that is unique to your Eonsfleet admin account."
      >
          <form onSubmit={handlePwd((v) => passwordMut.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current_password">Current Password</Label>
              <Input id="current_password" type="password" {...regPwd('current_password')} />
              <FieldError message={pwdErrors.current_password?.message} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new_password">New Password</Label>
                <Input id="new_password" type="password" {...regPwd('new_password')} />
                <FieldError message={pwdErrors.new_password?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input id="confirm_password" type="password" {...regPwd('new_password_confirmation')} />
                <FieldError message={pwdErrors.new_password_confirmation?.message} />
              </div>
            </div>
            <Button type="submit" disabled={passwordMut.isPending}>
              {passwordMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              {passwordMut.isPending ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
      </SettingCard>
    </div>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const qc = useQueryClient()

  const { data: sessions, isLoading } = useQuery<AdminSession[]>({
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
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <SettingCard
        icon={Monitor}
        title="Active Sessions"
        description="Review and revoke active admin sessions across devices."
      >
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)}
            </div>
          ) : sessions && sessions.length > 0 ? (
            <ul className="space-y-3">
              {sessions.map((session) => (
                <li key={session.id} className="rounded-md border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="truncate text-sm font-medium text-foreground">{session.user_agent}</p>
                        {session.is_current && <Badge variant="secondary" className="rounded-md text-[10px]">Current</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {session.ip} · Last active {format(new Date(session.last_active), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    {!session.is_current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => revokeMut.mutate(session.id)}
                        disabled={revokeMut.isPending}
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Revoke
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No active sessions found.</p>
          )}
      </SettingCard>

      <SettingCard
        icon={Shield}
        title="Two-Factor Authentication"
        description="Protect high-privilege access with an extra verification step."
      >
          <div className="rounded-md border border-dashed border-border p-4">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Authenticator App</p>
              <p className="mt-1 text-xs text-muted-foreground">
                TOTP enrollment is not enabled yet. Once backend support lands, this section can host QR setup, recovery codes, and enforcement status.
              </p>
            </div>
            <Badge variant="outline" className="mt-4 rounded-md text-muted-foreground">Coming Soon</Badge>
          </div>
      </SettingCard>
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
    <SettingCard
      icon={Bell}
      title="Email Notifications"
      description="Choose which platform events trigger email notifications."
    >
        <ul className="grid gap-3 lg:grid-cols-2">
          {NOTIFICATION_PREFS.map((pref) => {
            const enabled = prefs?.[pref.key] ?? false
            return (
              <li key={pref.key} className="flex items-center justify-between gap-4 rounded-md border border-border p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{pref.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{pref.description}</p>
                </div>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => toggle(pref.key, enabled)}
                    disabled={updateMut.isPending}
                    aria-label={`${enabled ? 'Disable' : 'Enable'} ${pref.label}`}
                  />
                )}
              </li>
            )
          })}
        </ul>
    </SettingCard>
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
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      {/* Maintenance mode */}
      <SettingCard
        icon={Sliders}
        title="Maintenance Mode"
        description="Control whether tenants can access the platform."
      >
          <div className="flex items-center justify-between gap-4 rounded-md border border-border p-4">
            <div>
              <p className="text-sm font-medium">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {settings?.maintenance_mode ? 'Platform is in maintenance mode' : 'Platform is live'}
              </p>
            </div>
            <Switch
              checked={!!settings?.maintenance_mode}
              onCheckedChange={toggleMaintenance}
              disabled={updateMut.isPending}
              aria-label="Toggle maintenance mode"
            />
          </div>
      </SettingCard>

      {/* Feature flags */}
      {settings?.feature_flags && Object.keys(settings.feature_flags).length > 0 && (
        <SettingCard
          icon={Sliders}
          title="Feature Flags"
          description="Enable or disable platform-level features for all tenants."
        >
            <ul className="space-y-3">
              {Object.entries(settings.feature_flags).map(([flag, enabled]) => (
                <li key={flag} className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                  <span className="min-w-0 truncate font-mono text-sm text-foreground">{flag}</span>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => toggleFlag(flag, enabled)}
                    disabled={updateMut.isPending}
                    aria-label={`Toggle ${flag}`}
                  />
                </li>
              ))}
            </ul>
        </SettingCard>
      )}

      {/* Allowed domains */}
      <SettingCard
        icon={Globe}
        title="Allowed Domains"
        description="Restrict tenant sign-up to specific email domains."
        className="xl:col-span-2"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. company.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
            />
            <Button onClick={addDomain} disabled={!newDomain.trim() || updateMut.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings?.allowed_domains?.length === 0 && (
              <p className="text-sm text-muted-foreground">No domain restrictions — all domains allowed.</p>
            )}
            {settings?.allowed_domains?.map((domain) => (
              <Badge key={domain} variant="secondary" className="gap-1.5 pr-1">
                {domain}
                <button onClick={() => removeDomain(domain)} className="ml-1 rounded-sm hover:text-destructive" aria-label={`Remove ${domain}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </SettingCard>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage account preferences, security posture, notifications, and platform controls."
        icon={Settings}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
            <User className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium">Signed in as</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email ?? 'Admin account'}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
            <Shield className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium">Role</p>
          <p className="mt-1 truncate text-xs capitalize text-muted-foreground">{user?.role?.replace('_', ' ') ?? 'Admin'}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
            <Bell className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium">Preference Center</p>
          <p className="mt-1 text-xs text-muted-foreground">Profile, security, alerts, and platform settings</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="profile"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <User className="mr-2 h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <Shield className="mr-2 h-4 w-4" /> Security
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <Bell className="mr-2 h-4 w-4" /> Notifications
          </TabsTrigger>
          <PermissionGate permission="admin.platform.manage" fallback={null}>
            <TabsTrigger
              value="platform"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Sliders className="mr-2 h-4 w-4" /> Platform
            </TabsTrigger>
          </PermissionGate>
        </TabsList>

        <TabsContent value="profile" className="mt-0"><ProfileTab /></TabsContent>
        <TabsContent value="security" className="mt-0"><SecurityTab /></TabsContent>
        <TabsContent value="notifications" className="mt-0"><NotificationsTab /></TabsContent>
        <TabsContent value="platform">
          <PermissionGate permission="admin.platform.manage">
            <PlatformTab />
          </PermissionGate>
        </TabsContent>
      </Tabs>
    </div>
  )
}
