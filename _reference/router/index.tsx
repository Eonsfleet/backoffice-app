import { createBrowserRouter, redirect } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppShell from '@/components/layout/AppShell'
import { GlobalErrorBoundary } from '@/components/shared/GlobalErrorBoundary'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import OrganizationsPage from '@/features/organizations/OrganizationsPage'
import OrganizationDetailsPage from '@/features/organizations/OrganizationDetailsPage'
import SubscriptionsPage from '@/features/subscriptions/SubscriptionsPage'
import DevicesPage from '@/features/devices/DevicesPage'
import AdminsPage from '@/features/admins/AdminsPage'
import AuditLogsPage from '@/features/audit-logs/AuditLogsPage'
import PerformancePage from '@/features/performance/PerformancePage'
import ProfilePage from '@/features/auth/ProfilePage'
import PlansPage from '@/features/subscriptions/PlansPage'

function requireAuth() {
    const token = useAuthStore.getState().token
    if (!token) return redirect('/login')
    return null
}

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
        errorElement: <GlobalErrorBoundary />,
    },
    {
        path: '/',
        element: <AppShell />,
        errorElement: <GlobalErrorBoundary />,
        loader: requireAuth,
        children: [
            { index: true, element: <DashboardPage /> },
            { path: 'organizations', element: <OrganizationsPage /> },
            { path: 'organizations/:id', element: <OrganizationDetailsPage /> },
            { path: 'subscriptions', element: <SubscriptionsPage /> },
            { path: 'subscriptions/plans', element: <PlansPage /> },
            { path: 'devices', element: <DevicesPage /> },
            { path: 'admins', element: <AdminsPage /> },
            { path: 'audit-logs', element: <AuditLogsPage /> },
            { path: 'performance', element: <PerformancePage /> },
            { path: 'profile', element: <ProfilePage /> },
        ],
    },
])
