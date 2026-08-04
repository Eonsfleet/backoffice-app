'use client'

import dynamic from 'next/dynamic'
import { useState, useMemo, useEffect } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  Search, RefreshCw, Navigation, WifiOff,
  MapPin, Car, ChevronRight, ExternalLink, Route, UserRound,
  Gauge, ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Badge }    from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getVehicle,
  getVehicleCurrentDriver,
  getVehicleCurrentTrip,
  getVehicleSensorHealth,
  listVehicles,
} from '@/features/vehicles/api'
import { getVehicleMapStatus } from '@/features/fleet-map/utils'
import type { Vehicle } from '@/types/api'

// ─── Dynamic import (Leaflet requires browser) ────────────────────────────────

const VehicleMap = dynamic(
  () => import('./VehicleMap').then((m) => ({ default: m.VehicleMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted/20 rounded-xl border border-dashed">
        <div className="text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground/40 animate-pulse" />
          <p className="mt-2 text-sm text-muted-foreground">Loading map…</p>
        </div>
      </div>
    ),
  },
)

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'moving' | 'idle' | 'offline'

const STATUS_DOT: Record<'moving' | 'idle' | 'offline', string> = {
  moving:  'bg-emerald-500',
  idle:    'bg-amber-500',
  offline: 'bg-slate-400',
}

const STATUS_ICON_CLASS: Record<'moving' | 'idle' | 'offline', string> = {
  moving:  'text-emerald-500',
  idle:    'text-amber-500',
  offline: 'text-slate-400',
}

const STATUS_BG: Record<'moving' | 'idle' | 'offline', string> = {
  moving:  'bg-emerald-500/10',
  idle:    'bg-amber-500/10',
  offline: 'bg-slate-500/10',
}

// ─── Status strip pill ────────────────────────────────────────────────────────

function Pill({
  filter, label, count, colorClass, activeClass, statusFilter, setStatusFilter, isLoading,
}: {
  filter: StatusFilter
  label: string
  count: number | string
  colorClass: string
  activeClass: string
  statusFilter: StatusFilter
  setStatusFilter: (f: StatusFilter) => void
  isLoading: boolean
}) {
  const active = statusFilter === filter
  return (
    <button
      onClick={() => setStatusFilter(active ? 'all' : filter)}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
        active ? activeClass : `${colorClass} hover:opacity-80`
      }`}
    >
      {isLoading ? '…' : count} {label}
    </button>
  )
}

function SelectedVehiclePanel({
  vehicle,
  isLoading,
  driverName,
  activeTrip,
  healthScore,
}: {
  vehicle: Vehicle
  isLoading: boolean
  driverName?: string
  activeTrip?: boolean
  healthScore?: number
}) {
  const loc = vehicle.current_location
  const mapsHref = loc
    ? `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`
    : null

  return (
    <div className="absolute right-3 top-3 z-[500] w-[min(360px,calc(100%-1.5rem))] rounded-lg border bg-background/95 p-4 shadow-lg backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-mono text-sm font-bold">{vehicle.plate_number}</p>
            <Badge variant="secondary" className="rounded-md capitalize">{getVehicleMapStatus(vehicle)}</Badge>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {vehicle.organization?.name ?? 'No organization'} · {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle'}
          </p>
        </div>
        {isLoading && <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid gap-2 text-xs min-[420px]:grid-cols-2">
        <div className="rounded-md border border-border p-2">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground"><Gauge className="h-3.5 w-3.5" /> Speed</div>
          <p className="font-semibold tabular-nums">{loc?.speed != null ? `${loc.speed} km/h` : '-'}</p>
        </div>
        <div className="rounded-md border border-border p-2">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Sensors</div>
          <p className="font-semibold tabular-nums">{healthScore != null ? `${healthScore}%` : '-'}</p>
        </div>
        <div className="rounded-md border border-border p-2">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground"><UserRound className="h-3.5 w-3.5" /> Driver</div>
          <p className="truncate font-semibold">{driverName ?? vehicle.driver?.name ?? '-'}</p>
        </div>
        <div className="rounded-md border border-border p-2">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground"><Route className="h-3.5 w-3.5" /> Trip</div>
          <p className="font-semibold">{activeTrip ? 'Active' : 'None'}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 min-[420px]:grid-cols-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/vehicles">
            <Car className="mr-1.5 h-3.5 w-3.5" /> Manage
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" disabled={!mapsHref}>
          <a href={mapsHref ?? '#'} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Maps
          </a>
        </Button>
      </div>

      {loc?.timestamp && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Last GPS update {formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true })}
        </p>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FleetMapView() {
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)

  const {
    data, isLoading, isFetching, isFetchingNextPage,
    hasNextPage, fetchNextPage, refetch, dataUpdatedAt,
  } = useInfiniteQuery({
    queryKey:        ['fleet-map-vehicles'],
    queryFn:         ({ pageParam }) => listVehicles({ has_device: true, per_page: 50, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    staleTime:       25_000,
    refetchInterval: 30_000,
  })

  // Auto-fetch every page so the map shows all vehicles
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const vehicles = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data])
  const selectedVehicleId = selectedVehicle?.id

  const vehicleDetailQ = useQuery({
    queryKey: ['fleet-map-vehicle-detail', selectedVehicleId],
    queryFn: () => getVehicle(selectedVehicleId!),
    enabled: !!selectedVehicleId,
    staleTime: 30_000,
  })

  const currentDriverQ = useQuery({
    queryKey: ['fleet-map-current-driver', selectedVehicleId],
    queryFn: () => getVehicleCurrentDriver(selectedVehicleId!),
    enabled: !!selectedVehicleId,
    staleTime: 30_000,
  })

  const currentTripQ = useQuery({
    queryKey: ['fleet-map-current-trip', selectedVehicleId],
    queryFn: () => getVehicleCurrentTrip(selectedVehicleId!),
    enabled: !!selectedVehicleId,
    staleTime: 30_000,
  })

  const sensorHealthQ = useQuery({
    queryKey: ['fleet-map-sensor-health', selectedVehicleId],
    queryFn: () => getVehicleSensorHealth(selectedVehicleId!),
    enabled: !!selectedVehicleId,
    staleTime: 30_000,
  })

  // Vehicles with a known GPS position
  const mappedVehicles = useMemo(
    () => vehicles.filter((v) => v.current_location != null),
    [vehicles],
  )

  // Summary counts
  const stats = useMemo(() => ({
    total:   mappedVehicles.length,
    moving:  mappedVehicles.filter((v) => getVehicleMapStatus(v) === 'moving').length,
    idle:    mappedVehicles.filter((v) => getVehicleMapStatus(v) === 'idle').length,
    offline: vehicles.filter((v) => !v.current_location).length,
  }), [mappedVehicles, vehicles])

  // Sidebar list — filter + search
  const sidebarVehicles = useMemo(() => {
    let list = [...vehicles]
    if (statusFilter === 'moving')  list = list.filter((v) => getVehicleMapStatus(v) === 'moving')
    if (statusFilter === 'idle')    list = list.filter((v) => getVehicleMapStatus(v) === 'idle')
    if (statusFilter === 'offline') list = list.filter((v) => !v.current_location)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (v) =>
          v.plate_number.toLowerCase().includes(q) ||
          v.driver?.name?.toLowerCase().includes(q) ||
          v.organization?.name?.toLowerCase().includes(q),
      )
    }
    return list
  }, [vehicles, statusFilter, search])

  const lastUpdated = dataUpdatedAt
    ? formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })
    : null

  const handleVehicleSelect = (v: Vehicle) => setSelectedVehicle(v)

  return (
    <div className="flex flex-col flex-1 gap-3" style={{ minHeight: 0 }}>

      {/* ── Status strip ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {isLoading ? '…' : stats.total} on map
        </div>

        <Pill
          filter="moving" label="moving" count={stats.moving}
          colorClass="bg-emerald-500/10 text-emerald-700" activeClass="bg-emerald-600 text-white"
          statusFilter={statusFilter} setStatusFilter={setStatusFilter} isLoading={isLoading}
        />
        <Pill
          filter="idle" label="idle" count={stats.idle}
          colorClass="bg-amber-500/10 text-amber-700" activeClass="bg-amber-500 text-white"
          statusFilter={statusFilter} setStatusFilter={setStatusFilter} isLoading={isLoading}
        />
        <Pill
          filter="offline" label="offline" count={stats.offline}
          colorClass="bg-slate-500/10 text-slate-600" activeClass="bg-slate-600 text-white"
          statusFilter={statusFilter} setStatusFilter={setStatusFilter} isLoading={isLoading}
        />

        <div className="ml-auto flex items-center gap-2">
          {lastUpdated && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              Updated {lastUpdated}
            </span>
          )}
          {isFetchingNextPage && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Loading more…
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div className="flex min-h-[640px] flex-col gap-3 lg:h-[calc(100dvh-220px)] lg:min-h-[520px] lg:flex-row">

        {/* Sidebar */}
        <aside className="flex max-h-72 w-full shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:max-h-none lg:w-72">

          {/* Search */}
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Plate, driver, org…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-0.5 p-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-2.5">
                    <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-2.5 w-20" />
                      <Skeleton className="h-2.5 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sidebarVehicles.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center px-4">
                <Car className="h-7 w-7 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No vehicles match</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {sidebarVehicles.map((v) => {
                  const mapStatus = getVehicleMapStatus(v)
                  const isSelected = selectedVehicle?.id === v.id
                  const hasLocation = v.current_location != null
                  return (
                    <li
                      key={v.id}
                      onClick={() => handleVehicleSelect(v)}
                      className={`flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors border-l-2 ${
                        isSelected
                          ? 'bg-primary/5 border-l-primary'
                          : 'border-l-transparent hover:bg-muted/40'
                      }`}
                    >
                      {/* Icon with status dot */}
                      <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${STATUS_BG[mapStatus]}`}>
                        <Navigation className={`h-3.5 w-3.5 ${STATUS_ICON_CLASS[mapStatus]}`} />
                        <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-background ${STATUS_DOT[mapStatus]}`} />
                      </div>

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs font-semibold text-foreground">
                          {v.plate_number}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {v.driver?.name ?? v.organization?.name ?? '—'}
                        </p>
                      </div>

                      {/* Speed or no-location indicator */}
                      <div className="shrink-0 text-right">
                        {hasLocation && v.current_location?.speed != null ? (
                          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                            {v.current_location.speed} <span className="text-muted-foreground/60">km/h</span>
                          </span>
                        ) : !hasLocation ? (
                          <WifiOff className="h-3 w-3 text-muted-foreground/40" />
                        ) : null}
                        {isSelected && hasLocation && (
                          <ChevronRight className="h-3 w-3 text-primary mt-0.5" />
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {!isLoading && (
            <div className="shrink-0 border-t bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              {sidebarVehicles.length} of {vehicles.length} vehicles shown
            </div>
          )}
        </aside>

        {/* Map canvas */}
        <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-xl border">
          {selectedVehicle && (
            <SelectedVehiclePanel
              vehicle={vehicleDetailQ.data ?? selectedVehicle}
              isLoading={vehicleDetailQ.isFetching || currentDriverQ.isFetching || currentTripQ.isFetching || sensorHealthQ.isFetching}
              driverName={currentDriverQ.data?.driver_name}
              activeTrip={!!currentTripQ.data}
              healthScore={sensorHealthQ.data?.health_score}
            />
          )}

          <VehicleMap
            vehicles={mappedVehicles}
            selectedVehicle={selectedVehicle}
            onVehicleClick={handleVehicleSelect}
          />

          {/* Empty state overlay */}
          {!isLoading && mappedVehicles.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/40 backdrop-blur-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted border">
                <MapPin className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">No GPS data available</p>
                <p className="mt-1 text-xs text-muted-foreground">Vehicles with active devices will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
