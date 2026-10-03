import { Suspense } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { RouteAccess } from '@/components/layout/RouteAccess'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground">Skip to main content</a>
      {/* Sidebar — hidden on mobile, visible md+ */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 lg:p-6">
          <ErrorBoundary>
            <Suspense fallback={<div className="animate-pulse rounded-lg bg-muted p-8">Loading workspace...</div>}><RouteAccess>{children}</RouteAccess></Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
