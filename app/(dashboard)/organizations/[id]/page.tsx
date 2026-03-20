import { OrgDetailView } from '@/features/organizations/components/OrgDetailView'

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <OrgDetailView id={id} />
}
