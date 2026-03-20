// ─── Generic ──────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string
  errors: Array<{
    status: string
    code: string
    title: string
    detail: string
    source?: { pointer: string }
  }>
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type AdminRole = 'super_admin' | 'support' | 'installer' | string

export interface AdminUser {
  id: string | number
  name: string
  email: string
  avatar: string | null
  role: AdminRole
  status?: 'active' | 'inactive'
  last_login: string | null
  created_at?: string
}

export interface AuthResponse {
  data: { token: string; user: AdminUser }
}

// ─── Organizations ────────────────────────────────────────────────────────────

export type OrgStatus = 'active' | 'grace' | 'restricted' | 'suspended'

export interface Organization {
  id: string | number
  name: string
  identifier?: string
  slug?: string
  owner_name?: string
  owner_email?: string
  email?: string
  phone?: string
  address?: string
  logo: string | null
  status: OrgStatus
  subscription_plan?: string | null
  vehicle_count?: number
  vehicle_limit?: number
  fleet_size?: number
  industry?: string
  domain?: string | null
  subdomain?: string | null
  joined_date?: string
  created_at?: string
  // Relationship counts
  total_vehicles?: number
  total_devices?: number
  current_plan?: {
    status: string
    plan: {
      id: number
      name: string
      price_monthly: number
      price_yearly: number
      vehicle_limit: number | null
    }
  }
}

// ─── Devices ──────────────────────────────────────────────────────────────────

export type DeviceStatus = 'online' | 'offline' | 'unassigned'

export interface Apn {
  id: string | number
  name: string
  status: number | null
  created_at?: string
}

export interface Hardware {
  id: string | number
  name: string
  slug?: string | null
  identifier?: string | null
  description?: string | null
  status?: boolean
  apn_id?: number | null
  created_at?: string
}

export interface Device {
  id: string | number
  device_id: string          // IMEI / device identifier
  status: DeviceStatus
  country?: string | null
  phone_number?: string | null
  is_online?: boolean
  has_fuel?: boolean
  last_packet_received_at: string | null   // last seen
  created_at: string
  hardware?: Hardware | null
  organization: { id: string | number; name: string } | null
  vehicle: { id: string | number; plate_number: string } | null
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'annual' | 'yearly'
export type SubStatus = 'active' | 'trial' | 'grace' | 'restricted' | 'suspended' | 'expired'

export interface Feature {
  id: string | number
  name: string
  slug: string
  description?: string
}

export interface Addon {
  id: string | number
  name: string
  price: number
  module: string
  description?: string
}

export interface SubscriptionPlan {
  id: string | number
  name: string
  description?: string
  price_monthly: number
  price_yearly: number
  has_custom_pricing: boolean
  features: Feature[]
  addons: Addon[]
  is_active: boolean
  subscriber_count?: number
  // legacy / fallback fields from some API responses
  price?: number
  billing_cycle?: BillingCycle
  vehicle_limit?: number
}

export interface Subscription {
  id: string | number
  organization: Pick<Organization, 'id' | 'name'>
  plan: Pick<SubscriptionPlan, 'id' | 'name'>
  status: SubStatus
  billing_cycle?: BillingCycle
  started_at: string
  ends_at: string | null
  next_billing_date?: string | null
  vehicle_count?: number
  mrr?: number
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export type PaymentGateway = 'paystack' | 'flutterwave'
export type TransactionStatus = 'successful' | 'failed' | 'pending'
export type InvoiceStatus = 'paid' | 'unpaid' | 'overdue'

export interface Transaction {
  id: string | number
  reference: string
  organization: Pick<Organization, 'id' | 'name'>
  amount: number
  gateway: PaymentGateway
  status: TransactionStatus
  created_at: string
}

export interface Invoice {
  id: string | number
  invoice_number: string
  organization: Pick<Organization, 'id' | 'name'>
  plan: string
  amount: number
  vat: number
  status: InvoiceStatus
  pdf_url?: string | null
  created_at: string
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface AuditLog {
  id: string | number
  action: string
  description?: string
  subject_type?: string
  subject_id?: string | null
  method?: string
  path?: string
  request_path?: string
  request_method?: string
  ip_address: string
  user_agent?: string
  risk_level: RiskLevel
  is_sensitive: boolean
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
  admin: Pick<AdminUser, 'id' | 'name' | 'email'>
  organization: Pick<Organization, 'id' | 'name'> | null
}

export interface AuditLogFilters {
  page?: number
  per_page?: number
  admin_id?: string | number
  organization_id?: string | number
  action?: string
  risk_level?: RiskLevel
  is_sensitive?: boolean
  method?: string
  from_date?: string
  to_date?: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  total_organizations:  number
  total_vehicles:       number
  total_users:          number
  total_devices:        number
  active_subscriptions: number
  online_devices?:      number
  revenue_this_month:   number
  organizations_growth?: number
}

// ─── Users (Tenant) ───────────────────────────────────────────────────────────

export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface TenantUser {
  id: string | number
  name: string
  email: string
  phone?: string | null
  avatar?: string | null
  role?: string
  status: UserStatus
  email_verified_at?: string | null
  last_login?: string | null
  created_at: string
  organization: Pick<Organization, 'id' | 'name'> | null
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export type VehicleStatus = 'active' | 'inactive' | 'maintenance' | 'in_transit' | string

export interface VehicleLocation {
  latitude: number
  longitude: number
  speed?: number | null
  heading?: number | null
  altitude?: number | null
  accuracy?: number | null
  timestamp?: string | null
}

export interface Vehicle {
  id: string | number
  // registration / display
  plate_number: string          // registration_number from API
  display_number?: string | null
  // specs
  make?: string | null
  model?: string | null
  year?: number | null
  color?: string | null
  body_type?: string | null
  fuel_type?: string | null
  chasis_number?: string | null
  image?: string | null
  // device
  device_id?: string | null       // IMEI/device_id from attributes
  device_connected?: boolean
  device_status?: string | null   // deviceStatus from attributes
  // odometer
  total_odometer?: number | null
  last_odometer_value?: string | null
  // status
  status: VehicleStatus
  updated_at?: string
  // relations
  organization: Pick<Organization, 'id' | 'name'> | null
  driver?: { id: string | number; name: string; avatar?: string | null; assigned_date?: string } | null
  current_location?: VehicleLocation | null
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface SubscriptionSummary {
  total:    number
  active:   number
  inactive: number
  canceled: number
}
