import { LayoutDashboard } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DashboardKpis } from '@/features/dashboard/components/DashboardKpis'
import { DeviceBreakdown } from '@/features/dashboard/components/DeviceBreakdown'
import { SubscriptionSummary } from '@/features/dashboard/components/SubscriptionSummary'
import { RecentActivity } from '@/features/dashboard/components/RecentActivity'
import { TopOrganizations } from '@/features/dashboard/components/TopOrganizations'
import { OrgPerformance } from '@/features/dashboard/components/OrgPerformance'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of fleet operations, KPIs, and recent activity."
        icon={LayoutDashboard}
      />

      {/* KPI cards */}
      <DashboardKpis />

      {/* Middle row: charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SubscriptionSummary />
        </div>
        <DeviceBreakdown />
      </div>

      {/* Bottom row: activity + top orgs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentActivity />
        <TopOrganizations />
      </div>

      {/* Org performance */}
      <OrgPerformance />
    </div>
  )
}
