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
  permissions?: string[]
  phone_number?: string | null
  status?: 'active' | 'inactive'
  last_login: string | null
  created_at?: string
}

export interface AuthResponse {
  data: { token: string; user: AdminUser }
}

// ─── Organizations ────────────────────────────────────────────────────────────

export type OrgStatus =
  | 'active' | 'inactive' | 'trial'
  | 'grace' | 'restricted' | 'suspended' | 'expired'
  | string

export interface Organization {
  id: string | number
  name: string
  identifier?: string
  slug?: string
  owner_name?: string
  owner_email?: string
  email?: string
  phone?: string
  /** Human-readable single line, built from the address parts below. */
  address?: string
  street?: string
  city?: string
  state?: string
  country?: string
  zipcode?: string
  logo: string | null
  status: OrgStatus | null
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
    /** Subscription id — what the admin change-plan endpoint is addressed by. */
    id?: string | number
    status: string
    subscription_type?: 'poc' | 'production' | string
    billing_cycle?: BillingCycle
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
export type SubStatus = 'active' | 'trial' | 'grace' | 'restricted' | 'suspended' | 'expired' | 'canceled'

export interface Feature {
  id: string | number
  name: string
  slug: string
  description?: string
  unit?: number | null
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
  // Per-asset pricing (kobo)
  vehicle_price_monthly_kobo?: number
  vehicle_price_yearly_kobo?: number
  device_price_monthly_kobo?: number
  device_price_yearly_kobo?: number
  trial_vehicle_limit?: number
  trial_device_limit?: number
  has_custom_pricing: boolean
  features: Feature[]
  addons: Addon[]
  is_active: boolean
  is_public: boolean
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
  subscription_type?: 'poc' | 'production' | string
  payment_state?: 'current' | 'failed' | 'suspended' | string | null
  is_payment_restricted?: boolean
  billing_cycle?: BillingCycle
  started_at: string
  ends_at: string | null
  next_billing_date?: string | null
  trial_ends_at?: string | null
  poc_asset_limit?: number | null
  scheduled_plan_id?: string | number | null
  scheduled_plan_version_id?: string | number | null
  plan_change_effective_at?: string | null
  price?: number
  vehicle_count?: number
  mrr?: number
}

export interface BillingLot {
  id: string | number
  name?: string | null
  status?: string | null
  vehicle_count?: number | null
  rate_minor?: number | null
  total_minor?: number | null
  billing_cycle?: BillingCycle | string | null
  current_period_start_at?: string | null
  current_period_end_at?: string | null
  next_renewal_at?: string | null
}

export interface ContractDiscount {
  id: string | number
  target: 'base' | 'lot' | 'all' | string
  lot_id?: string | number | null
  kind: 'percent_bps' | 'fixed_minor' | string
  value: number
  starts_at?: string | null
  ends_at?: string | null
}

export interface OrganizationBillingHistory {
  lots: BillingLot[]
  transactions: Transaction[]
  invoices: Invoice[]
  discounts: ContractDiscount[]
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export type PaymentGateway = 'paystack' | 'flutterwave'
export type TransactionStatus = 'successful' | 'failed' | 'pending'
export type InvoiceStatus = 'issued' | 'paid' | 'void' | string

export interface Transaction {
  id: string | number
  reference: string
  amount: number
  currency?: string
  payment_method: string
  status: TransactionStatus
  paid_at?: string | null
  created_at: string
  organization: { id: string | number; name: string; email?: string } | null
  subscription?: {
    id: string | number
    billing_cycle?: string
    status?: string
    plan?: { id: string | number; name: string }
  } | null
}

export interface Invoice {
  id: string | number
  invoice_number: string
  organization: Pick<Organization, 'id' | 'name'> | null
  plan: string | null
  amount: number | null
  vat: number | null
  status: InvoiceStatus
  pdf_available?: boolean
  created_at: string | null
}

export interface ReconciliationMismatch {
  id: string | number
  provider: string
  provider_settlement_id: string
  subscription_transaction_id: string | number
  kind: string
  expected_minor: number
  actual_minor: number
  status: string
  created_at: string
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface AuditLog {
  id: string | number
  source?: string
  actor_type?: 'admin' | 'tenant_user' | 'system' | string
  actor?: Pick<AdminUser, 'id' | 'name' | 'email'> | null
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
  actor_type?: 'admin' | 'tenant_user'
  q?: string
  from_date?: string
  to_date?: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  total_organizations?:  number
  total_vehicles?:       number
  total_users?:          number
  total_devices?:        number
  active_subscriptions?: number
  online_devices?:      number
  revenue_this_month?:   number
  organizations_growth?: number
}

// ─── Users (Tenant) ───────────────────────────────────────────────────────────

export type UserStatus =
  | 'active' | 'inactive' | 'suspended' | 'blocked'
  | 'pending_activation' | 'invite_sent' | 'email_verified' | 'exit'
  | string

export interface TenantUser {
  id: string | number
  name: string
  email: string
  phone?: string | null
  avatar?: string | null
  role?: string
  status: UserStatus
  employee_number?: string | null
  date_of_birth?: string | null
  email_verified_at?: string | null
  last_login?: string | null
  created_at: string
  deleted_at?: string | null
  organization: Pick<Organization, 'id' | 'name'> | null
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export type VehicleStatus =
  | 'active' | 'inactive'
  | 'in_transit' | 'in_use' | 'available' | 'stopped'
  | 'under_maintenance' | 'maintenance' | 'needs_inspection'
  | 'out_of_service' | 'decommissioned' | 'gps_disconnected'
  | string

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
  fuel_capacity?: number | null
  fuel_capacity_unit?: string | null
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
  created_at?: string
  // relations
  organization: Pick<Organization, 'id' | 'name' | 'identifier'> | null
  driver?: { id: string | number; name: string; avatar?: string | null; assigned_date?: string } | null
  current_location?: VehicleLocation | null
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface SubscriptionSummary {
  total:    number
  active:   number
  inactive: number
  cancelled: number
}
