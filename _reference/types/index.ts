// --- Auth ---
export interface LoginPayload {
    email: string
    password: string
}

export interface LoginResponse {
    token: string
    // token_type: string
    // expires_in: number
    // expires_at: string
    user: AdminProfile
}

export interface AdminProfile {
    id: number
    name: string
    email: string
    avatar: string | null
    role: 'super_admin' | 'support' | 'installer'
}

// --- Dashboard ---
export interface DashboardMetrics {
    total_organizations: number
    total_vehicles: number
    active_subscriptions: number
    total_devices: number
    total_trips_today: number
    revenue_this_month: number
}

// --- Organization ---
export interface Organization {
    id: number
    identifier?: string | number
    name: string
    email?: string
    fleet_size?: number
    industry?: string
    phone?: string
    logo?: string | null
    slug: string
    domain: string | null
    subdomain: string | null
    joined_date: string
}

// --- Subscription ---
export interface Plan {
    id: number
    name: string
    price: number
    billing_cycle: 'monthly' | 'yearly'
    vehicle_limit: number
    features: Feature[]
    addons: Addon[]
}

export interface Feature {
    id: number
    name: string
    slug: string
    description: string
}

export interface Addon {
    id: number
    name: string
    price: number
    description: string
}

export interface Subscription {
    id: number
    organization: Pick<Organization, 'id' | 'name'>
    plan: Pick<Plan, 'id' | 'name'>
    status: 'active' | 'trial' | 'grace' | 'restricted' | 'suspended' | 'expired'
    started_at: string
    ends_at: string | null
    vehicle_count: number
}

// --- Device ---
export interface Device {
    id: number
    imei: string
    serial_number: string
    status: string
    hardware: Hardware | null
    organization: Pick<Organization, 'id' | 'name'> | null
    created_at: string
}

export interface Hardware {
    id: number
    name: string
    model: string
    manufacturer: string
}

// --- Admin User ---
export interface AdminUser {
    id: number
    name: string
    email: string
    avatar: string | null
    role: 'super_admin' | 'support' | 'installer'
    last_login: string | null
}

// --- Audit Log ---
export interface AuditLog {
    id: number
    action: string
    description: string
    method: string
    path: string
    ip_address: string
    user_agent: string
    risk_level: 'low' | 'medium' | 'high' | 'critical'
    is_sensitive: boolean
    old_values: Record<string, unknown> | null
    new_values: Record<string, unknown> | null
    created_at: string
    admin: Pick<AdminUser, 'id' | 'name' | 'email'>
    organization: Pick<Organization, 'id' | 'name'> | null
}

// --- Pagination ---
export interface PaginatedResponse<T> {
    data: T[]
    meta: {
        current_page: number
        last_page: number
        per_page: number
        total: number
    }
}

// --- API Error ---
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
