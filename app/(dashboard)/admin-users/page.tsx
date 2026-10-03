import { AdminUsersTab } from '@/features/users/components/UsersWorkspace'
import { PageHeader } from '@/components/shared/PageHeader'
import { Shield } from 'lucide-react'

export default function AdminUsersPage() {
  return <div className="space-y-6"><PageHeader title="Internal administrators" description="Manage the Eonsfleet team and their platform access." icon={Shield} /><AdminUsersTab /></div>
}
