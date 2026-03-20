# EonsFleet Backoffice Web App — Build Prompt

---

## PROJECT BRIEF

Build a **responsive, production-ready backoffice web application** for **EonsFleet** — a fleet management SaaS platform. This is the **platform admin panel**, separate from the tenant-facing client app. It manages organizations (tenants), devices, subscriptions, users, and platform health.

---

## TECH STACK

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 14** (App Router) | SSR for dashboard, CSR for real-time views |
| Language | **TypeScript** (strict) | No `any` types |
| UI | **shadcn/ui** + **Tailwind CSS** | Use `cn()` utility |
| State | **Zustand** (global) + **TanStack Query v5** (server) | No Redux |
| Forms | **React Hook Form** + **Zod** | Schemas mirror API validation |
| Charts | **Recharts** | Line, bar, pie, area |
| Tables | **TanStack Table v8** | Sorting, filtering, pagination |
| Real-time | **Laravel Reverb** via **Pusher JS** | Org-scoped channels |
| Icons | **Lucide React** | Consistent icon set |
| Dates | **date-fns** | No moment.js |
| HTTP | **Axios** instance with interceptors | Auto-injects headers |
| Auth | **Next-Auth v5** or custom context | Stores Passport token |

---

## AUTHENTICATION

**API Base:** `https://api.eonsfleet.io`

**Required headers on every request:**
```http
Authorization: Bearer {admin_token}
X-Request-Type: admin
Content-Type: application/json
Accept: application/json
```

**Login flow:**
- `POST /v1/auth/admin/login` — `{ email, password }`
- Response: `{ data: { token, user: { id, name, email, role } } }`
- Store token in `httpOnly` cookie + Zustand auth store
- Logout: `GET /v1/auth/admin/logout` then clear cookie

**Token validation:**
- On app load, call `GET /v1/auth/admin/profile` to verify token
- 401 response → redirect to `/login`
- Wrap all protected routes in `AdminAuthGuard`

---

## ROLES & PERMISSIONS

Three built-in admin roles (plus dynamic roles creatable by superadmin):

| Role | Access |
|---|---|
| `super_admin` | Full platform access — all modules, all actions |
| `support` | Read all tenant data, manage installers, view analytics & audit logs |
| `installer` | View vehicles/devices, assign/deassign devices to vehicles only |

**Permission gates in UI:**
- Use a `usePermission(permission: string)` hook
- Conditionally render action buttons, menu items, and route access
- 403 page for unauthorized route access (not just hidden buttons)
- Superadmin can create custom roles with granular permission assignment

---

## LAYOUT & NAVIGATION

**Shell layout** (persistent across all authenticated pages):

```
┌─────────────────────────────────────────────────────┐
│ Sidebar (collapsible, 240px → 64px icon-only)       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Logo + "EonsFleet Admin"                        │ │
│ │ ─────────────────────────                       │ │
│ │ Dashboard                                       │ │
│ │ Organizations                                   │ │
│ │ Devices                                         │ │
│ │ Fleet Map                [live]                 │ │
│ │ Subscriptions                                   │ │
│ │ Billing & Payments                              │ │
│ │ Admin Users                                     │ │
│ │ Audit Logs                                      │ │
│ │ Analytics                                       │ │
│ │ Settings                                        │ │
│ │ ─────────────────────────                       │ │
│ │ [Avatar] Name · Role              [logout]      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Top bar: Breadcrumb | Search | Notifications bell   │
└─────────────────────────────────────────────────────┘
```

- Sidebar collapses to icon-only on mobile (drawer overlay)
- Active route highlighted
- Notification bell polls for admin alerts
- Global search (Cmd+K) opens command palette — searches orgs, devices, users

---

## MODULE SPECIFICATIONS

---

### 1. DASHBOARD (`/dashboard`)

**API:** `GET /v1/admin/dashboard-metrics`, `GET /v1/admin/dashboard-organizations`, `GET /v1/admin/dashboard-devices`

**KPI cards (top row):**
- Total Organizations (+ growth vs last month)
- Active Vehicles
- Online Devices (live count)
- Total Users
- Monthly Revenue (from subscription analytics)
- Active Subscriptions

**Charts row:**
- **Line chart** — New organizations over last 12 months
- **Bar chart** — Top 5 organizations by trip count (from `topOrganizationTripChart`)
- **Donut chart** — Device status distribution (online/offline/unassigned)
- **Area chart** — Subscription plan distribution

**Recent activity feed:**
- Last 10 audit log entries (actor, action, target, risk badge, time ago)

**Subscription health table:**
- Organizations with subscription issues: expiring in 7 days, grace period, restricted, suspended
- Columns: Org name, plan, status, days remaining, action button

---

### 2. ORGANIZATIONS (`/organizations`)

**List view:**

API: `GET /v1/admin/organizations` (with filters: status, plan, search, date range, page)

Table columns:
- Organization name + identifier code
- Owner name + email
- Subscription plan (badge)
- Vehicle count / limit
- Status (active, grace, restricted, suspended — color-coded badge)
- Created date
- Actions: View, Edit, Suspend, Delete

Filters sidebar:
- Status multiselect
- Plan multiselect
- Date range picker
- Search by name/email/identifier

**Organization detail view** (`/organizations/{id}`):

Tabs:
1. **Overview** — Profile fields (name, address, phone, logo), stats, subscription summary
2. **Users** — Table of org users with role badges; actions: view profile, deactivate
3. **Vehicles** — Table with registration, make/model, status, assigned driver, device
4. **Subscription** — Current plan, billing cycle, next invoice date, payment method, history
5. **Invoices** — Paginated invoice list; download PDF button
6. **Devices** — Devices assigned to org vehicles
7. **Activity** — Audit log entries scoped to this org (infinite scroll)

**Create/Edit Organization** (slide-over panel):
- Fields: name, address, phone, email, subscription plan assignment
- Logo upload (Cloudinary)

**Organization actions** (superadmin only):
- Force-assign subscription plan
- Reset subscription
- Suspend / unsuspend
- Transfer ownership
- Delete (soft) with confirmation dialog

---

### 3. DEVICES (`/devices`)

**List view:**

API: `GET /v1/admin/devices` with filters

Table columns:
- Device IMEI / serial number
- Hardware model
- Assigned organization
- Assigned vehicle (plate number)
- Status badge: online / offline / unassigned
- Last seen (relative time)
- Signal strength indicator
- Firmware version
- Actions: View, Assign, Reassign, Deactivate

Filters: status, organization, hardware model, date added

**Device detail view** (`/devices/{id}`):

Tabs:
1. **Overview** — All device fields, IMEI, firmware, SIM ICCID, config
2. **Assignment history** — Timeline of vehicle assignments
3. **Telemetry** — Last GPS packet data (lat/lng on mini map, speed, heading, satellites)
4. **Activity** — Config changes, status events

**Bulk operations** (superadmin + support):
- Bulk assign to organization
- Bulk firmware update flag
- Bulk export CSV

**Device assignment flow** (installer role):
- Search vehicle by plate number within an organization
- Confirm assignment modal
- API: `POST /v1/admin/devices/{id}/assign`

---

### 4. FLEET MAP (`/fleet-map`)

**Real-time vehicle tracking** using WebSocket (Reverb/Pusher):

- Full-screen map (Mapbox GL JS or Leaflet with OpenStreetMap)
- Org selector dropdown (superadmin sees all orgs)
- Vehicle markers with color by status: moving (green), idle (yellow), offline (grey)
- Clicking marker opens side panel:
  - Vehicle info (plate, make/model, driver name)
  - Last GPS timestamp
  - Speed, heading, ignition
  - Trip status badge
  - Link to full vehicle page in client org
- Search/filter vehicles by org, status, plate
- Live counter: "X vehicles online"

**WebSocket channel:** `location.organization.{organizationId}` — subscribe per org or all orgs for superadmin (fan-out client-side)

---

### 5. SUBSCRIPTIONS (`/subscriptions`)

**Plans management** (`/subscriptions/plans`):

API: `GET /v1/subscriptions/plans`

Table: plan name, price, billing cycle, features count, active subscriber count, status
Actions: Create, Edit, Activate/Deactivate (superadmin only)

**Plan create/edit** (full-page form):
- Fields: name, description, price (kobo), billing cycle (monthly/annual), vehicle limit, features checklist, addons
- Feature flags from platform feature list

**Addons management** (`/subscriptions/addons`):
- CRUD addons with price and feature mapping

**Subscriber list** (`/subscriptions/subscribers`):
- All active subscriptions across platform
- Columns: org name, plan, status, billing cycle, next billing date, MRR contribution
- Filter by plan, status, billing cycle

**Subscription analytics** (`/subscriptions/analytics`):

API: `GET /v1/admin/analytics/subscriptions/summary`, `GET /v1/admin/analytics/subscriptions/status-distribution`

- MRR / ARR cards
- Churn rate (last 30 days)
- New subscriptions chart (line, 12 months)
- Plan distribution donut
- Status distribution (active, grace, restricted, suspended) bar chart

---

### 6. BILLING & PAYMENTS (`/billing`)

**Transactions list:**
- Platform-wide payment transactions
- Columns: reference, org name, amount, gateway (Paystack/Flutterwave), status, date
- Filter: gateway, status, date range
- Export CSV

**Invoice management:**
- All invoices across platform
- Columns: invoice number, org, plan, amount, VAT, status, date, PDF link
- Download invoice PDF action

**Dunning overview:**
- Organizations currently in grace / restricted / suspended state
- Days in current state
- Last payment attempt
- Manual retry payment action (superadmin only)

---

### 7. ADMIN USERS (`/admin-users`)

> Superadmin only

**List view:**

API: `GET /v1/admin/users`

Table: name, email, role badge, last login, status, created date
Actions: Edit, Deactivate, Delete

**Create admin user** (modal):
- Fields: name, email, role (select from existing roles)
- Password auto-generated and emailed on creation
- API: `POST /v1/admin/users`

**Edit admin user** (slide-over):
- Update name, email, role assignment
- Force password reset toggle
- API: `PATCH /v1/admin/users/{id}`

**Role management** (`/admin-users/roles`):
- List of all admin roles (built-in + custom)
- Built-in roles: read-only (no delete)
- Custom roles: create, edit permissions, delete
- Permission assignment UI: grouped checkboxes by feature area
- Drag-to-reorder permission groups

---

### 8. AUDIT LOGS (`/audit-logs`)

API: `GET /v1/admin/audit-logs`

**Filters:**
- Admin actor (multi-select)
- Organization (multi-select)
- Risk level (low / medium / high / critical — color badges)
- Sensitive only toggle
- Action type (created/updated/deleted/viewed)
- Date range picker
- HTTP method

**Table columns:**
- Actor (admin name + avatar)
- Action + subject type (e.g. "updated Organization")
- Organization context
- Risk badge (color: green/yellow/orange/red)
- Sensitive flag (lock icon)
- IP address
- Timestamp

**Log detail drawer** (click row):
- Full JSON diff view: `old_values` vs `new_values` (side-by-side diff with syntax highlight)
- Full request path, method, user agent
- Related entity link (if org/vehicle/user)

**Export:**
- `POST /v1/admin/audit-logs/export` — CSV download with current filters
- Summary stats: `GET /v1/admin/audit-logs/summary`

---

### 9. ANALYTICS (`/analytics`)

**Fleet health overview:**
- Maintenance alert counts by status (triggered, acknowledged, overdue, work_order_created)
- Incident counts by state (open, investigating, resolved, closed)
- Trip completion rate across all orgs

**Device health:**
- Online vs offline ratio over time (line chart, 30 days)
- Devices not seen > 24h (alert table)
- Firmware version distribution (bar chart)

**Growth metrics:**
- New organizations per month (12 months)
- Vehicle fleet size growth
- User registrations per month

All charts include: date range picker, CSV export button, zoom/pan on hover.

---

### 10. SETTINGS (`/settings`)

Tabs:
1. **Profile** — Update own name, email, avatar, password
2. **Security** — Active sessions list with revoke, 2FA toggle (future)
3. **Notifications** — Email notification preferences for platform events
4. **Platform** — (superadmin only) Global platform settings: maintenance mode toggle, feature flags, allowed domains

---

## SHARED COMPONENTS

Build these as reusable components:

| Component | Purpose |
|---|---|
| `<DataTable>` | TanStack Table wrapper with sorting, pagination, column visibility toggle |
| `<StatusBadge>` | Color-coded status pill (map status strings to colors) |
| `<KpiCard>` | Metric card with value, label, trend indicator |
| `<ConfirmDialog>` | Generic destructive action confirmation modal |
| `<SlideOver>` | Right-panel drawer for create/edit forms |
| `<EmptyState>` | Consistent empty data UI with icon + message |
| `<ErrorBoundary>` | Per-route error recovery with retry |
| `<Pagination>` | Controlled pagination with page size selector |
| `<DateRangePicker>` | Calendar range input with presets (Today, 7d, 30d, 90d, Custom) |
| `<CommandPalette>` | Cmd+K global search overlay |
| `<AvatarUpload>` | Cloudinary-backed image upload with crop |
| `<JsonDiffViewer>` | Side-by-side JSON diff for audit logs |
| `<MapView>` | Reusable map wrapper (Mapbox/Leaflet) |
| `<PermissionGate>` | Wrap children — renders only if permission granted |
| `<RiskBadge>` | Risk level badge (low=green, medium=yellow, high=orange, critical=red) |

---

## API LAYER

Create a typed API client at `lib/api/`:

```typescript
// lib/api/client.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'X-Request-Type': 'admin',
    'Accept': 'application/json',
  },
})

// Interceptors: inject Authorization header, handle 401 redirect, parse error format
```

**Error format** (backend custom):
```typescript
interface ApiError {
  message: string
  errors: Array<{
    status: string
    code: string
    title: string
    detail: string
    source: { pointer: string } // e.g. "/data/attributes/email"
  }>
}
```

Parse `errors[].source.pointer` to map validation errors back to form fields via React Hook Form `setError()`.

Create typed service modules:
- `lib/api/auth.ts`
- `lib/api/organizations.ts`
- `lib/api/devices.ts`
- `lib/api/subscriptions.ts`
- `lib/api/adminUsers.ts`
- `lib/api/auditLogs.ts`
- `lib/api/analytics.ts`
- `lib/api/billing.ts`

---

## REAL-TIME (WebSocket)

```typescript
// lib/pusher.ts
import Pusher from 'pusher-js'

const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
  wsPort: 443,
  forceTLS: true,
  cluster: 'mt1',
  authEndpoint: `${API_URL}/broadcasting/auth`,
  auth: {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Request-Type': 'admin',
    }
  }
})
```

Fleet map subscribes to `location.organization.{id}` channel, event `LocationUpdated`.

---

## PERMISSIONS MAP

Gates to enforce in UI (use `usePermission` hook):

| UI Action | Required Permission |
|---|---|
| Create/edit organization | `admin.organizations.manage` |
| Delete organization | `admin.organizations.delete` |
| Manage subscription plans | `admin.subscriptions.manage` |
| View audit logs | `admin.audit.view` |
| Export audit logs | `admin.audit.export` |
| Manage admin users | `admin.users.manage` |
| Assign device to vehicle | `admin.devices.assign` |
| View billing/invoices | `admin.billing.view` |
| Suspend organization | `admin.organizations.suspend` |
| View fleet map | `admin.tracking.view` |

Superadmin bypasses all permission checks.

---

## UX REQUIREMENTS

- **Responsive** — works on 320px mobile up to 4K desktop; sidebar collapses to bottom nav on mobile
- **Dark/light mode** — system preference default, manual toggle persisted to `localStorage`
- **Optimistic updates** — status changes reflect immediately, revert on API error
- **Loading states** — skeleton loaders (not spinners) for table rows and KPI cards
- **Toast notifications** — success/error/warning toasts (top-right, 4s auto-dismiss)
- **Keyboard navigation** — all modals/dialogs trap focus; Escape closes; Tab navigates
- **Empty states** — every empty table/list has an illustration + contextual CTA
- **Error boundaries** — per-route; show retry button without full page reload
- **Infinite scroll OR pagination** — use pagination for tables (10/25/50/100 per page), infinite scroll for audit log feed
- **Accessibility** — WCAG 2.1 AA; all interactive elements have `aria-label`; color not sole differentiator

---

## PROJECT STRUCTURE

```
backoffice/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Shell with sidebar + topbar
│   │   ├── dashboard/page.tsx
│   │   ├── organizations/
│   │   │   ├── page.tsx            # List
│   │   │   └── [id]/page.tsx       # Detail tabs
│   │   ├── devices/
│   │   ├── fleet-map/page.tsx
│   │   ├── subscriptions/
│   │   ├── billing/
│   │   ├── admin-users/
│   │   ├── audit-logs/
│   │   ├── analytics/
│   │   └── settings/
│   └── api/                        # Next.js API routes (token exchange only)
├── components/
│   ├── ui/                         # shadcn primitives
│   ├── shared/                     # Reusable app components (DataTable, KpiCard, etc.)
│   ├── layout/                     # Sidebar, Topbar, CommandPalette
│   └── modules/                    # Feature-specific components
├── lib/
│   ├── api/                        # Typed API services
│   ├── pusher.ts
│   ├── auth.ts
│   └── utils.ts
├── stores/
│   ├── auth.store.ts               # Zustand auth state
│   └── ui.store.ts                 # Sidebar collapse, theme
├── hooks/
│   ├── usePermission.ts
│   ├── usePusherChannel.ts
│   └── useDebounce.ts
├── types/
│   └── api.ts                      # All API response types
└── middleware.ts                   # Next.js route protection
```

---

## SECURITY REQUIREMENTS

- Token stored in `httpOnly` cookie — never `localStorage`
- All API calls go through server-side Next.js route or axios with interceptors — never expose token to `window`
- `X-Request-Type: admin` header **must** be sent on every request — backend rejects requests without it
- CSRF: use `SameSite=Strict` cookie policy
- Role check both client-side (UX) and rely on server 403 responses
- No sensitive data in URL query params (use POST body or headers)
- Log frontend errors to Sentry (`NEXT_PUBLIC_SENTRY_DSN`)

---

## ENVIRONMENT VARIABLES

```env
NEXT_PUBLIC_API_URL=https://api.eonsfleet.io
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=mt1
NEXT_PUBLIC_REVERB_HOST=reverb.eonsfleet.io
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## DELIVERABLES

1. Fully functional Next.js 14 app matching all module specs above
2. All API types in `types/api.ts` derived from the backend response shapes
3. All protected routes behind `AdminAuthGuard` with role-based access
4. Storybook stories for all shared components (optional but preferred)
5. `README.md` with setup, env vars, and deployment instructions
6. Docker-ready: `Dockerfile` + `docker-compose.yml` for local dev
