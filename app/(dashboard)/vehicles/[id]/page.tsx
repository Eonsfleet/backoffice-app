import { VehicleDetailView } from '@/features/vehicles/components/VehicleDetailView'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <VehicleDetailView id={id} />
}
