import { LayoutDashboard } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DashboardKpis } from '@/features/dashboard/components/DashboardKpis'
import { DeviceBreakdown } from '@/features/dashboard/components/DeviceBreakdown'
import { RecentActivity } from '@/features/dashboard/components/RecentActivity'
import { OrgPerformance } from '@/features/dashboard/components/OrgPerformance'
import { DashboardAnalytics, DashboardGrowthCard } from '@/features/dashboard/components/DashboardAnalytics'

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
          <DashboardAnalytics />
        </div>
        <DeviceBreakdown />
      </div>

      {/* Performance row */}
      <div className="grid gap-4 xl:grid-cols-2">
        <OrgPerformance />
        <DashboardGrowthCard />
      </div>

      {/* Recent activity */}
      <RecentActivity />
    </div>
  )
}
