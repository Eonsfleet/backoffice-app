'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Truck, ArrowLeft } from 'lucide-react'
import { getVehicle, getVehicleSensorHealth } from '../api'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryError } from '@/components/shared/QueryError'
import { CopyValue } from '@/components/shared/CopyValue'
import { Timestamp } from '@/components/shared/Timestamp'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useSearchParams } from 'next/navigation'

export function VehicleDetailView({ id }: { id: string }) {
  const params = useSearchParams()
  const tab = params.get('tab') === 'sensors' ? 'sensors' : 'overview'
  const query = useQuery({ queryKey: ['vehicle', id], queryFn: () => getVehicle(id), staleTime: 30_000 })
  const sensors = useQuery({ queryKey: ['vehicle-sensors', id], queryFn: () => getVehicleSensorHealth(id), enabled: tab === 'sensors' && !!query.data, staleTime: 30_000 })
  if (query.isError) return <QueryError error={query.error} retry={() => void query.refetch()} label="this vehicle" />
  if (query.isPending || !query.data) return <Skeleton className="h-96 w-full" />
  const vehicle = query.data
  const location = vehicle.current_location
  return <div className="space-y-6">
    <Button asChild variant="ghost" size="sm"><Link href="/vehicles"><ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />Vehicles</Link></Button>
    <PageHeader title={vehicle.plate_number || 'Vehicle details'} icon={Truck} description={[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || 'Vehicle information'} actions={<Button asChild variant="outline"><Link href="/fleet-map">Open fleet map</Link></Button>} />
    <div className="flex flex-wrap items-center gap-3"><StatusBadge status={vehicle.status} /><CopyValue value={vehicle.id} label="Vehicle ID" />{vehicle.organization && <Link href={`/organizations/${vehicle.organization.id}`} className="text-sm text-primary">{vehicle.organization.name}</Link>}</div>
    <Tabs value={tab} onValueChange={value => { const url = new URL(window.location.href); url.searchParams.set('tab', value); window.history.replaceState(null, '', `${url.pathname}${url.search}`) }}>
      <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="sensors">Sensor health</TabsTrigger></TabsList>
      <TabsContent value="overview" className="mt-5"><div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Vehicle information</CardTitle></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-2">{[['Body type', vehicle.body_type], ['Fuel type', vehicle.fuel_type], ['Color', vehicle.color], ['Chassis', vehicle.chasis_number], ['Current driver', vehicle.driver?.name], ['Fuel capacity', vehicle.fuel_capacity != null ? `${vehicle.fuel_capacity} ${vehicle.fuel_capacity_unit ?? ''}` : null]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value || 'Unavailable'}</dd></div>)}</dl></CardContent></Card>
      <Card><CardHeader><CardTitle>Device and last position</CardTitle></CardHeader><CardContent className="space-y-4"><div><p className="mb-1 text-xs text-muted-foreground">Device identifier</p><CopyValue value={vehicle.device_id} label="Device identifier" /></div><StatusBadge status={vehicle.device_status} />{location ? <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Coordinates</dt><dd className="mt-1 text-sm tabular-nums">{location.latitude}, {location.longitude}</dd></div><div><dt className="text-xs text-muted-foreground">Recorded speed</dt><dd className="mt-1 text-sm tabular-nums">{location.speed != null ? `${location.speed} km/h` : 'Unavailable'}</dd></div><div><dt className="mb-1 text-xs text-muted-foreground">Last recorded position</dt><dd><Timestamp value={location.timestamp} /></dd></div></dl> : <p className="text-sm text-muted-foreground">No position returned. This does not establish whether the vehicle is moving or offline.</p>}</CardContent></Card></div></TabsContent>
      <TabsContent value="sensors" className="mt-5">{sensors.isError ? <QueryError error={sensors.error} retry={() => void sensors.refetch()} label="sensor health" /> : sensors.isPending ? <Skeleton className="h-64 w-full" /> : !sensors.data?.sensors?.length ? <p className="py-10 text-center text-sm text-muted-foreground">No sensor checks returned for this vehicle.</p> : <div className="grid gap-4 sm:grid-cols-2">{sensors.data.sensors.map(sensor => <Card key={sensor.name}><CardHeader><CardTitle>{sensor.name}</CardTitle></CardHeader><CardContent className="space-y-3"><StatusBadge status={sensor.status} />{sensor.description && <p className="text-sm">{sensor.description}</p>}{sensor.suggested_action && <p className="text-sm text-muted-foreground">{sensor.suggested_action}</p>}</CardContent></Card>)}</div>}<p className="mt-4 text-xs text-muted-foreground">Sensor states are computed by the backend from available telemetry; they are not a physical inspection.</p></TabsContent>
    </Tabs>
  </div>
}
