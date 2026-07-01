# lib/api/ — Typed Client-Side API Services

These are **client-side** typed service modules used by React components and hooks.

## Files
- `client.ts`         → Axios instance (baseURL, auth header interceptor, 401 handler)
- `auth.ts`           → Login/logout/session — calls app/api/auth/* routes (cookie management)
- `organizations.ts`  → Organization CRUD
- `devices.ts`        → Device management
- `subscriptions.ts`  → Plans, addons, subscribers
- `adminUsers.ts`     → Admin user management
- `auditLogs.ts`      → Audit log queries + export
- `analytics.ts`      → Analytics & dashboard metrics
- `billing.ts`        → Transactions & invoices

## Rule
All files here (except auth.ts) import and use the `api` Axios instance from
`client.ts` and call the backend directly. Never use fetch() here.
