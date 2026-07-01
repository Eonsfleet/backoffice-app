import { DeviceDetailView } from '@/features/devices/components/DeviceDetailView'

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <DeviceDetailView id={id} />
}
