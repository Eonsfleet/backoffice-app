import { LayoutDashboard, Building2, Users, Truck, Cpu, Map, CreditCard, ScrollText, BarChart3, Settings, Bell, ClipboardList, Shield, Layers, Wrench, ClipboardCheck, Activity, FileText, Video, Fuel } from 'lucide-react'
import type { AdminUser } from '@/types/api'
import { hasPermission } from '@/hooks/usePermission'
import { COMMERCIAL_SECTIONS, LEGACY_BILLING_ROUTES } from './commercial-navigation'

export const NAV_GROUPS = [
  { label: 'Overview', items: [
    { href: '/dashboard', label: 'Platform overview', icon: LayoutDashboard },
  ] },
  { label: 'Customers', items: [
    { href: '/organizations', label: 'Organizations', icon: Building2, permission: 'admin.organizations.view' },
    { href: '/customer-health', label: 'Customer health', icon: BarChart3, permission: 'admin.organizations.view' },
    { href: '/organization-requests', label: 'Onboarding requests', icon: ClipboardList, permission: 'admin.organizations.manage' },
    { href: '/users', label: 'Customer users', icon: Users, superOnly: true },
  ] },
  { label: 'Commercial', items: [
    { href: '/subscriptions', label: 'Subscriptions', icon: Layers, permission: 'admin.subscriptions.view' },
    { href: '/billing', label: 'Billing & payments', icon: CreditCard, permission: 'admin.billing.view' },
  ] },
  { label: 'Fleet operations', items: [
    { href: '/vehicles', label: 'Vehicles & assets', icon: Truck, superOnly: true },
    { href: '/drivers', label: 'Drivers', icon: Users, superOnly: true },
    { href: '/devices', label: 'Devices', icon: Cpu, permission: 'admin.devices.view' },
    { href: '/fuel-specs', label: 'Fuel reference', icon: Fuel, permission: 'admin.fuel_specs.view' },
    { href: '/fleet-map', label: 'Fleet map', icon: Map, permission: 'admin.tracking.view' },
  ] },
  { label: 'Operations', items: [
    { href: '/installers', label: 'Installers', icon: Wrench, superOnly: true },
    { href: '/odometer-reviews', label: 'Odometer reviews', icon: ClipboardCheck },
    { href: '/analytics', label: 'Operational reports', icon: BarChart3, superOnly: true },
    { href: '/notifications', label: 'Notification center', icon: Bell },
  ] },
  { label: 'Engagement', items: [
    { href: '/webinars', label: 'Webinars', icon: Video, permission: 'admin.webinars.view' },
  ] },
  { label: 'Platform', items: [
    { href: '/platform-health', label: 'Service health', icon: Activity, superOnly: true },
    { href: '/notification-templates', label: 'Notification templates', icon: FileText, superOnly: true },
  ] },
  { label: 'Governance', items: [
    { href: '/admin-users', label: 'Internal admins', icon: Shield, superOnly: true },
    { href: '/admin-users/roles', label: 'Roles & permissions', icon: Layers, superOnly: true },
    { href: '/audit-logs', label: 'Audit logs', icon: ScrollText, permission: 'admin.audit.view' },
  ] },
  { label: 'System', items: [
    { href: '/settings', label: 'Settings', icon: Settings, superOnly: true },
  ] },
]

export type NavigationItem = { href: string; label: string; icon: React.ElementType; permission?: string; superOnly?: boolean }

export function canAccessNavigation(user: AdminUser | null, item: NavigationItem) {
  if (!user) return false
  if (item.superOnly) return user.role === 'super_admin'
  return !item.permission || hasPermission(user, item.permission)
}

export function getRouteItem(path: string): NavigationItem | undefined {
  const canonicalPath = LEGACY_BILLING_ROUTES[path] ?? path
  const commercial = [...COMMERCIAL_SECTIONS.subscriptions, ...COMMERCIAL_SECTIONS.billing]
    .sort((a, b) => b.href.length - a.href.length)
    .find(item => canonicalPath === item.href || canonicalPath.startsWith(`${item.href}/`))
  if (commercial) return commercial
  return NAV_GROUPS.flatMap(group => group.items).sort((a, b) => b.href.length - a.href.length)
    .find(item => path === item.href || path.startsWith(`${item.href}/`))
}
