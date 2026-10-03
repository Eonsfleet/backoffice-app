'use client'
import { useAuthStore } from '@/stores/auth.store'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Cpu, ArrowLeft, Wifi, WifiOff, CircleDashed,
  Building2, Car, Fingerprint, Layers, Radio,
  Calendar, Clock, PowerOff, Loader2,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { getDevice, deactivateDevice } from '@/features/devices/api'
import type { Device } from '@/types/api'

function InfoRow({ icon: Icon, label, value, mono = false }: {
  icon: React.ElementType
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}


function StatusIcon({ status }: { status: Device['status'] }) {
  if (status === 'online')  return <Wifi className="h-5 w-5 text-emerald-500" />
  if (status === 'offline') return <WifiOff className="h-5 w-5 text-muted-foreground" />
  return <CircleDashed className="h-5 w-5 text-blue-500" />
}

export function DeviceDetailView({ id }: { id: string }) {
  const canManage = useAuthStore(s => s.user?.role === 'super_admin')
  const router = useRouter()
  const qc = useQueryClient()
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => getDevice(id),
    staleTime: 30_000,
  })

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateDevice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device', id] })
      qc.invalidateQueries({ queryKey: ['devices'] })
      toast.success('Device deactivated')
      setDeactivateOpen(false)
    },
    onError: () => toast.error('Failed to deactivate device'),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Cpu className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">Device not found.</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/devices')} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={device.device_id}
          description={device.phone_number ?? undefined}
          icon={Cpu}
          className="pb-0"
          actions={
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeactivateOpen(true)}
              disabled={!canManage || deactivateMutation.isPending}
            >
              {deactivateMutation.isPending
                ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                : <PowerOff className="mr-1.5 h-3.5 w-3.5" />
              }
              Deactivate
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: device info */}
        <div className="space-y-4 lg:col-span-2">
          {/* Identity card */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
                <StatusIcon status={device.status} />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-lg font-semibold text-foreground">{device.device_id}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={device.status} />
                  {device.hardware?.name && (
                    <Badge variant="outline" className="text-xs">{device.hardware.name}</Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
              <InfoRow icon={Fingerprint} label="Device ID"    value={device.device_id}    mono />
              <InfoRow icon={Radio}       label="Hardware"     value={device.hardware?.name} />
              <InfoRow icon={Layers}      label="Phone Number" value={device.phone_number}  mono />
              <InfoRow icon={Layers}      label="Country"      value={device.country} />
              <InfoRow icon={Calendar}    label="Registered"
                value={device.created_at ? format(new Date(device.created_at), 'MMM d, yyyy') : null}
              />
            </CardContent>
          </Card>

          {/* Signal strength */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Signal Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {device.last_packet_received_at
                  ? `Last seen ${formatDistanceToNow(new Date(device.last_packet_received_at), { addSuffix: true })} (${format(new Date(device.last_packet_received_at), 'MMM d, yyyy HH:mm')})`
                  : 'No packets received yet'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: assignment */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Organization */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Organization</p>
                {device.organization ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary uppercase">
                      {device.organization.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{device.organization.name}</p>
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => router.push(`/organizations/${device.organization!.id}`)}
                      >
                        View organization
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">Not assigned</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Vehicle */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Vehicle</p>
                {device.vehicle ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Car className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="font-mono text-sm font-medium">{device.vehicle.plate_number}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Car className="h-4 w-4" />
                    <span className="text-sm">No vehicle assigned</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                size="sm"
                disabled={!canManage} onClick={() => setDeactivateOpen(true)}
              >
                <PowerOff className="mr-2 h-3.5 w-3.5" /> Deactivate Device
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={canManage && deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate Device"
        description={`Deactivate device ${device.device_id}? It will stop reporting data until reactivated.`}
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={() => deactivateMutation.mutateAsync()}
      />
    </div>
  )
}
