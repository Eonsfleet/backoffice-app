import { MapPin } from 'lucide-react'
import { PageHeader }   from '@/components/shared/PageHeader'
import { FleetMapView } from '@/features/fleet-map/components/FleetMapView'

export default function FleetMapPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Fleet Map"
        description="Live GPS positions of all active vehicles."
        icon={MapPin}
      />
      <FleetMapView />
    </div>
  )
}
