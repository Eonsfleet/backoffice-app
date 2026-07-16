# Backoffice Billing & Subscription UI/UX Implementation Prompt

This document is a self-contained brief for implementing the backoffice (admin-facing) user interface for EonsFleet's billing and subscription system. It assumes no prior familiarity with this codebase. It covers what to build, who is allowed to see and do what, and the exact shape of every API request and response the UI will talk to.

The backend for everything described here is already built, tested, and merged. This prompt is for the frontend/UI layer and its integration with these existing APIs only. Do not design or modify backend behavior — treat the API contracts below as fixed.

---

## 1. Context

EonsFleet is a fleet-management SaaS platform. Its billing system was recently rebuilt around these ideas:

- Organizations (tenants) are one of four types: **PoC** (proof-of-concept trial), **Trial**, **Production**, or **Converted** (a former PoC that became a real customer).
- Every organization has a **billing status**: Active, Suspended, or Cancelled.
- Plans are **versioned** — editing a plan's price or limits never overwrites history; it creates a new version and the plan moves forward onto it. Old versions remain visible for historical subscriptions.
- Money amounts are always Naira (major units, e.g. `4500` meaning ₦4,500) at the API boundary. Internally the backend stores integer kobo, but every request payload and response value you will send or receive is already in Naira — never divide or multiply by 100 yourself.
- Refunds and credit notes are two different, deliberately separate concepts:
  - A **refund** pushes money back through the original payment provider (Paystack/Flutterwave) to the customer's original payment method.
  - A **credit note** never touches the payment provider — it adds a forward balance the organization can draw down against future invoices.
- **Contract discounts** are persistent, sales-negotiated terms tied to an organization (e.g. "15% off forever" or "₦5,000 off this specific vehicle lot"). They are not coupons — there is no concept of a customer-facing promo code in this system.
- **PoC organizations** run on a fixed evaluation window. An admin can grant exactly one extension. When the window ends, the org enters a **grace period** (during which it can no longer create new records — vehicles, drivers, users, trips, etc. — but can still read and edit existing data). At the end of grace, an admin must either **convert** the PoC into a real production organization (re-parenting all its data) or the system will eventually **hard-delete** it.
- **Reconciliation mismatches** are discrepancies the system found between what a payment provider actually settled and what the internal ledger expected — these need human review by finance.
- **Anonymization** redacts an organization's personally-identifying fields (name, email, phone, and its users' names/emails/phones) on request — it never deletes financial records (invoices, transactions, refunds stay intact forever for audit/compliance reasons).

## 2. Roles and What Each Can See/Do

There are three backoffice admin roles relevant to this UI. Authorization is enforced via three backend "gates" (not role-string checks):

| Gate | Roles allowed | Covers |
|---|---|---|
| `billing.manage-catalog` | **super_admin** only | Plan/addon/feature catalog changes, approving PoC extensions, converting PoC orgs, anonymizing an organization |
| `billing.money` | **finance**, **super_admin** | Refunds, credit notes, contract discounts, viewing reconciliation mismatches |
| `billing.operational` | **support**, **finance**, **super_admin** | Defined in the backend but **not currently wired to any endpoint** — see the gaps section below |

Design the UI so that:
- **super_admin** sees everything: plan/addon/feature catalog management, organization provisioning, PoC lifecycle actions, and (since super_admin also passes `billing.money`) refunds/credit notes/discounts/reconciliation too.
- **finance** sees: refunds, credit notes, discounts, reconciliation mismatches, and read-only views of subscriptions/transactions/invoices. Finance should **not** see plan/addon/feature editing, PoC extend/convert, or anonymization actions — those are super_admin only.
- **support** sees: read-only views — organization list/detail, subscription list/detail, transaction history, invoices. Support should **not** see any money-moving action (refund/credit/discount), any catalog-editing action, or PoC lifecycle actions.

**Important — read this before building role-gating into the UI:** several endpoints described below (organization creation, plan/addon/feature CRUD, subscription manual activation, the general organization list) are currently protected only by "is this an authenticated admin" — there is no server-side role check distinguishing super_admin from support from finance on those specific endpoints. The UI's role-based hiding of controls is, for those endpoints, the *only* enforcement that currently exists. Section 8 ("Known Backend Gaps") lists exactly which endpoints this applies to. Flag this to the backend team; do not assume the server will reject a support user who somehow triggers a super_admin-only action on those specific endpoints.

## 3. Conventions Used Throughout This Document

**Base path:** every endpoint below is prefixed with `/v1`. So "GET admins/subscriptions/plans" means `GET /v1/admins/subscriptions/plans`.

**Authentication:** every endpoint requires a valid admin bearer token (the same backoffice login session already used elsewhere in the admin app) and the request's `Origin` header must be the backoffice origin so the backend resolves the `admin` guard correctly.

**Two different success response shapes exist** depending on which part of the API you're calling — do not assume they're the same:

- **Shape A** (used by everything under `admins/subscriptions/*` and organization endpoints):
  ```json
  {
    "message": "Plans retrieved successfully",
    "data": { ... },
    "status": 200
  }
  ```
  Note the redundant `status` field duplicating the HTTP status code inside the body.

- **Shape B** (used by everything under `admins/billing/*` — refunds, credit notes, discounts, mismatches, PoC actions, anonymization):
  ```json
  {
    "message": "refund initiated",
    "data": { ... }
  }
  ```
  No `status` field in the body — rely on the actual HTTP status code.

**One consistent error shape is used everywhere**, regardless of which endpoint or what went wrong (validation failure, permission denied, not found, business-rule violation):

```json
{
  "message": "The refund amount exceeds the refundable balance for this transaction.",
  "errors": [
    {
      "status": "422",
      "code": "BUSINESS_RULE_VIOLATION",
      "title": "Validation Failed",
      "detail": "The refund amount exceeds the refundable balance for this transaction.",
      "source": { "pointer": "/data/attributes/amount" }
    }
  ]
}
```

- `message` is always a single human-readable summary — safe to show directly in a toast/alert.
- `errors` is always an array (even when there's only one problem) — for field-level validation errors, iterate it and match each entry's `source.pointer` (present only on field validation errors) to highlight the specific form field.
- `status` inside each error entry is a **string**, not a number.
- Common `code` values you will encounter: `VALIDATION_ERROR` (per-field form validation), `BUSINESS_RULE_VIOLATION` (a business rule was violated, HTTP 422), `FORBIDDEN` (403 — wrong role), `NOT_FOUND` / `RESOURCE_NOT_FOUND` (404), `UNAUTHENTICATED` (401).

**Pagination shape**, used by every paginated list endpoint's `data.pagination` field: a `current` page number, `lastPage` count, `total` record count, `perPage` size, and a `next_page_url` (null on the last page).

**Two different resource shapes exist for the "data" payload** in list/show endpoints:
- Most resources are wrapped as `{ "id": ..., "attributes": { ... }, "relationships": { ... } }` (a JSON:API-flavored envelope).
- Endpoints under `admins/billing/*` (refunds, credit notes, discounts, mismatches, PoC lifecycle rows) return the **raw database row** as `data` — flat fields, no `attributes`/`relationships` wrapper. Look at each endpoint's response example below carefully; don't assume one shape applies everywhere.

---

## 4. Pages to Build

Organize the backoffice billing UI into these sections. Exact navigation/IA is your call, but every capability listed under each heading must be reachable.

### 4.1 Plan Catalog (super_admin only)
- A list view of all plans: name, monthly price, yearly price, vehicle limit, and which features/addons are attached.
- A create-plan form and an edit-plan form. Both must clearly communicate that saving a price or limit change does **not** overwrite the plan — it creates a new version going forward; existing subscribers keep whatever version they're already on until they're moved to a new one elsewhere in the system. Non-priced fields (name, description) update in place with no version created.
- **Do not build the ability to view historical plan versions or usage-quota fields (SMS/API/storage caps) yet** — the backend doesn't expose these via this API today. See Section 8.

### 4.2 Addon Catalog (super_admin only)
- List, create, edit, and delete addons (each addon: name, price, and a "module" identifier string).
- Deleting an addon must show a clear error if it's currently attached to an active subscription (the backend will reject with a specific message — see Section 6).
- Editing an addon's price must communicate that it does **not** retroactively change the price for organizations that already purchased it — the price is locked in at time of purchase.

### 4.3 Feature Catalog (super_admin only)
- List and create features (name + description). There is currently no edit or delete endpoint for features — don't build controls for actions that don't exist.

### 4.4 Organizations (super_admin and support)
- A searchable, paginated list of all organizations.
- An organization detail view showing its profile info, address, vehicle/device/user/admin counts, and current plan/subscription status.
- Suspend and unsuspend actions.
- A "Create Organization" flow (manual/sales-assisted onboarding) that **requires** the operator to choose a billing type before the org can be created — there is no way to create an org without picking one. The three choices and what each requires are described in Section 6.4.
- **Do not build filtering by organization type (PoC/Trial/Production/Converted) or by billing status (Active/Suspended/Cancelled) into the list view** — the backend doesn't support these as query filters today, only free-text search and a generic `status` filter. See Section 8.

### 4.5 PoC Lifecycle (super_admin only)
- On a PoC organization's detail view, show its evaluation window end date, whether its one-time extension has been used, and (if applicable) its grace period end date.
- An "Approve Extension" action (asks for number of extra days) — disabled/hidden once the org has already used its one extension, or once its grace period has already ended.
- A "Convert to Production" action, which asks for the new production organization's name, email, fleet size, and industry, then re-parents all of the PoC org's vehicles, drivers, devices, users, and telemetry history to a brand-new production organization. This is a significant, non-reversible action — require an explicit confirmation step in the UI before submitting.
- **Do not build a "read-only grace period" visual indicator that blocks UI actions** — the backend enforces creation-blocking during grace itself (any create action will come back as a 403 automatically); you don't need to pre-emptively disable create buttons based on grace state, though showing a banner explaining why creation failed (using the returned error message) is good practice.

### 4.6 Subscriptions & Transactions (super_admin, finance, support — all read; manual activation is intended for super_admin/finance but not currently gated)
- A list of all subscriptions platform-wide with search.
- A subscription detail view showing its plan, status, trial info, unlocked feature modules, and its transaction history.
- A platform-wide transaction list with filters: status, payment method, organization, date range.
- A "Manually Activate Subscription" action for offline payments (bank transfers) — takes an optional payment reference and note, creates an audit-trailed manual transaction record.

### 4.7 Invoices (read-only, all three roles)
- Invoice list and detail view (per organization, reachable from the organization detail page) and PDF download.
- Note: the endpoints for invoices in the codebase currently live under the client-facing subscriptions routes with tenant-scoped auth (`/v1/subscriptions/invoices...`), not under `admins/`. Confirm with the backend team whether backoffice roles reach these through impersonation/tenant-switching or whether a dedicated admin invoice endpoint needs to be added before building this page. Do not guess at an admin-specific invoice endpoint — it does not exist today.

### 4.8 Refunds (finance, super_admin)
- From a transaction detail view, a "Refund" action: amount (Naira) and a required reason. Show the transaction's already-refunded amount and remaining refundable balance if available, since the backend will reject any refund that would exceed it.
- Refunds start in a `pending` state and settle asynchronously via provider webhook — the UI should show status as pending/settled/failed and not assume a refund is complete just because the request succeeded (HTTP 201 only means the refund was *initiated*).

### 4.9 Credit Notes (finance, super_admin)
- From an organization detail view, an "Issue Credit Note" action: amount (Naira), required reason, and an optional external reference (e.g. a support-ticket ID) — supplying the same reference twice is safe and will not double-issue the credit.
- Show the organization's running credit balance somewhere on its detail page (this endpoint doesn't return the running balance directly — you may need to request that the backend add it, or fetch it from wherever the organization's credit balance is otherwise exposed).

### 4.10 Contract Discounts (finance, super_admin)
- From an organization detail view, a "Create Discount" action. The operator must choose:
  - **Target**: the whole base subscription, one specific subscription lot, or all charges.
  - **Kind**: a percentage (expressed in basis points, e.g. 1500 = 15%) or a fixed Naira amount off.
  - A start date, and an optional end date (open-ended if omitted).
  - If target is "lot", a specific lot must be selected; if target is anything else, no lot should be sent.
- There is no list/edit/delete endpoint for discounts today — only creation. Don't build management controls for actions that don't exist; flag this to the backend team if a list/history view is wanted.

### 4.11 Reconciliation (finance, super_admin)
- A paginated list of open reconciliation mismatches: which provider, what kind of mismatch (amount mismatch / unknown settlement / missing settlement), expected vs. actual amount, and status.
- Filterable by status.
- **There is no "resolve/close" action exposed by this endpoint** — it's read-only today. If the intended workflow is that finance resolves a mismatch by issuing a refund/credit-note that references it, or if a dedicated "mark resolved" endpoint should be added, confirm with the backend team before promising that capability in the UI.

### 4.12 Anonymization (super_admin only)
- A clearly dangerous, separately-confirmed action (e.g. behind a "Danger Zone" section on the organization detail page): "Anonymize this organization's personal data." Explain in the confirmation dialog that this redacts the organization's and its users' names/emails/phone numbers permanently, but keeps all financial records (invoices, transactions, subscriptions) fully intact — it is not the same as deleting the organization, and it cannot be undone.

### 4.13 Analytics (all three roles, read-only)
- Subscription summary, status distribution, and MRR (monthly recurring revenue) dashboards. See Section 6.12 for exact response shapes — these endpoints exist but weren't inspected in depth for this document; confirm their response shape directly before building charts against them.

---

## 5. Manual Org Creation: The Three Billing Types

When building the "Create Organization" form (Section 4.4), the billing-type choice controls which additional fields are required:

- **`poc`** — no extra fields required (an optional `evaluation_days` integer may be sent to override the default 30-day evaluation window). Starts a PoC lifecycle automatically.
- **`trial`** — requires `plan_id` (which plan the trial will convert to). Starts a time-boxed trial on that plan.
- **`direct_subscription`** — requires both `plan_id` and `billing_cycle` (`monthly` or `yearly`). Creates an active, paying subscription immediately, anchored to today's date.

Omitting `billing_type` entirely, or sending an unrecognized value, is rejected with a 422 before the organization is created at all — there is no code path that creates an organization without one of these three types resolved.

---

## 6. API Reference

### 6.1 Plans

**GET `admins/subscriptions/plans`** — list all plans. No query parameters.

Success (200, Shape A):
```json
{
  "message": "Plans retrieved successfully",
  "data": [
    {
      "id": 3,
      "attributes": {
        "name": "Starter",
        "description": "Best for small teams.",
        "price_monthly": 4500,
        "price_yearly": 54000,
        "has_custom_pricing": false,
        "vehicle_limit": 25
      },
      "relationships": {
        "features": [
          { "id": 1, "attributes": { "name": "Live Tracking", "unit": null, "description": "Real-time GPS tracking." }, "relationships": {} }
        ],
        "addons": [
          { "id": 4, "attributes": { "name": "Basic Reporting", "price": 1500, "module": "basic_reporting" } }
        ]
      }
    }
  ]
}
```

**GET `admins/subscriptions/plans/{id}`** — single plan, same shape as one item above.

Error if not found: 404, `code: "RESOURCE_NOT_FOUND"`.

**POST `admins/subscriptions/plans`** — create a plan.

Request body:
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | |
| `description` | string | yes | |
| `price_monthly` | number | yes | Naira |
| `price_yearly` | number | yes | Naira |
| `has_custom_pricing` | boolean | yes | |
| `features` | array of `{id, unit}` | no | `id` must reference an existing feature; `unit` is an optional numeric cap |
| `addons` | array of integers | no | addon IDs to attach |

Success: 201, Shape A, `data` is the created plan in the same shape as above.

Errors: 422 with per-field `VALIDATION_ERROR` entries if `name`/`description`/`price_monthly`/`price_yearly`/`has_custom_pricing` are missing, if a `features[].id` or `addons[]` value doesn't reference a real feature/addon.

**PUT/PATCH `admins/subscriptions/plans/{id}`** — update a plan. All fields optional; only what you send is changed. Sending `features` or `addons` **fully replaces** the existing set (not a merge). Same field table as create, all marked "sometimes" instead of required. Editing any of the priced fields listed in Section 4.1 (`price_monthly`, `price_yearly`, `vehicle_limit`, `user_limit`, `admin_limit`, etc.) creates a new version behind the scenes — this is invisible in the response (you still just get back the updated plan), but existing subscriptions on the previous version are unaffected until moved separately.

Success: 200, Shape A.

### 6.2 Addons

**GET `admins/subscriptions/addons`** — list. Same shape as an addon's `attributes` above.

**POST `admins/subscriptions/addons`** — create.
| Field | Type | Required |
|---|---|---|
| `name` | string | yes |
| `price` | number (Naira) | yes |
| `module` | string | yes |

Success: 201, Shape A.

**PUT/PATCH `admins/subscriptions/addons/{id}`** — update. All fields optional (`name`, `price`, `module`). `module` must be unique across addons if provided.

Success: 200, Shape A.

**DELETE `admins/subscriptions/addons/{id}`** — delete.

Success: 204, empty body.

Error: 422 if the addon is attached to any currently-active subscription — message: *"Addon is attached to one or more active subscriptions and cannot be deleted."*

### 6.3 Features

**GET `admins/subscriptions/features`** — list.

**POST `admins/subscriptions/features`** — create.
| Field | Type | Required |
|---|---|---|
| `name` | string | yes |
| `description` | string | yes |

Success: 201, Shape A. No update/delete endpoint exists.

### 6.4 Organizations

**GET `admin/organizations`** — list, paginated.

Query parameters: `q` (search), `status`, `sortBy`, `orderBy`, `per_page`, `page`. (No `type` or `billing_status` filter — see Section 8.)

Success (200, Shape A):
```json
{
  "message": "success",
  "data": {
    "organizations": [
      {
        "id": "42",
        "attributes": {
          "name": "Acme Fleet",
          "email": "support@acme.com",
          "fleet_size": 50,
          "industry": "Logistics",
          "logo": null,
          "subdomain": "acme",
          "custom_domain": null,
          "phone": "+2348120734527",
          "joined_date": "2026-01-15T10:00:00Z",
          "identifier": "308219",
          "status": "active"
        },
        "relationships": {
          "address": { "...": "AddressResource, present only if loaded" },
          "total_vehicles": 12,
          "total_devices": 12,
          "total_users": 8,
          "total_admins": 2,
          "current_plan": {
            "status": "active",
            "plan": { "id": 3, "name": "Starter", "price_monthly": 4500, "price_yearly": 54000, "vehicle_limit": 25 }
          }
        }
      }
    ],
    "pagination": { "current": 1, "lastPage": 5, "total": 112, "perPage": 10, "next_page_url": "..." }
  }
}
```

Note: this resource does **not** currently include the organization's `type` (poc/trial/production/converted) or `billing_status` (active/suspended/cancelled) fields — see Section 8.

**POST `admin/organizations`** — create (manual/sales-assisted onboarding).

Request body:
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | 3–255 chars |
| `email` | string | yes | must be a valid, unique email |
| `fleet_size` | integer | yes | |
| `industry` | string | yes | |
| `logo`, `phone_number`, `street`, `city`, `state` | string | no | |
| `country` | string | no | min 3 chars if provided |
| `billing_type` | string | yes | one of `poc`, `trial`, `direct_subscription` |
| `plan_id` | integer | required if `billing_type` is `trial` or `direct_subscription` | must reference an existing plan |
| `billing_cycle` | string | required if `billing_type` is `direct_subscription` | `monthly` or `yearly` |
| `evaluation_days` | integer | no | only meaningful for `poc`; min 1 |

Success: 201, Shape A, `data` is the created organization (same shape as list item).

Errors: 422 with field-level errors for missing `name`/`email`/`fleet_size`/`industry`; 422 if `billing_type` is missing or not one of the three values; 422 if `plan_id`/`billing_cycle` are missing when required by the chosen `billing_type`; 422 if `email` is already in use.

**POST `admin/organizations/{id}/suspend`** — suspend. Success: 200, Shape A, message *"Organization suspended successfully"*, no meaningful `data`.

**POST `admin/organizations/{id}/unsuspend`** — unsuspend. Success: 200, Shape A, message *"Organization reactivated successfully"*.

**DELETE `admin/organizations/{id}`** — delete. Success: 200 with no body content on success (`noContent()`), or a generic *"Failed to delete organization"* message on failure. This is a genuinely destructive delete — do not confuse it with anonymization (Section 6.9), which preserves the record.

### 6.5 Subscriptions & Transactions

**GET `admins/subscriptions`** — list all subscriptions. Query: `q` (search), `per_page`, `page`.

Success (200, Shape A):
```json
{
  "message": "Subscriptions retrieved successfully",
  "data": {
    "subscriptions": [
      {
        "id": 91,
        "attributes": { "started_at": "...", "ended_at": "...", "organization_id": 42, "status": "active" },
        "relationships": {
          "organization": { "...": "OrganizationResource" },
          "plan": { "id": 3, "name": "Starter" }
        }
      }
    ],
    "pagination": { "...": "..." }
  }
}
```

**GET `admins/subscriptions/{id}/show`** — single subscription detail.

Success (200, Shape A):
```json
{
  "message": "Subscription retrieved successfully",
  "data": {
    "id": 91,
    "attributes": { "started_at": "...", "ended_at": "...", "organization_id": 42, "status": "active" },
    "relationships": {
      "organization": { "...": "OrganizationResource" },
      "plan": {
        "id": 3, "name": "Starter", "vehicle_limit": 25, "user_limit": null, "admin_limit": null,
        "trial": false, "trial_ends_at": null,
        "core_modules": [{ "name": "Live Tracking", "slug": "live_tracking" }],
        "advanced_capabilities": [{ "name": "Route Optimization", "slug": "route_optimization" }]
      },
      "transactions": [ "...": "SubscriptionTransactionResource, see below" ]
    }
  }
}
```
Note: while `status` is `trial`, `core_modules`/`advanced_capabilities` list **every** feature in the system (all modules unlocked during trial), not just the assigned plan's features — this is intentional.

**GET `admins/subscriptions/{id}/transactions`** — that subscription's transaction history.

**GET `admins/subscriptions/transactions`** — platform-wide transaction list. Query: `q` (search by payment reference), `status`, `payment_method`, `organization_id`, `from`, `to` (dates as `Y-m-d`), `per_page`.

Transaction shape (`SubscriptionTransactionResource`):
```json
{
  "id": "5001",
  "attributes": {
    "reference": "PSK_a1b2c3",
    "amount": 4500,
    "currency": "NGN",
    "payment_method": "card",
    "status": "successful",
    "paid_at": "2026-02-01T09:00:00Z",
    "created_at": "2026-02-01T08:59:50Z"
  },
  "relationships": {
    "organization": { "id": 42, "name": "Acme Fleet", "email": "support@acme.com", "identifier": "308219" },
    "subscription": { "id": 91, "billing_cycle": "monthly", "status": "active", "plan": { "id": 3, "name": "Starter" } }
  }
}
```

**PATCH `admins/subscriptions/{id}/activate`** — manually activate (offline payment).

Request body (all optional): `payment_reference` (string), `note` (string).

Success: 200, Shape A, `data` is the updated subscription (Detail shape above).

Errors: 422 *"Subscription is already active."* if already active; 422 *"Cancelled subscriptions cannot be reactivated. Create a new subscription instead."* if cancelled.

### 6.6 PoC Lifecycle

**POST `admins/billing/organizations/{organizationId}/poc/extend`** — approve the one allowed extension.

Requires `billing.manage-catalog` (super_admin only).

Request body: `extra_days` (integer, required, min 1).

Success (200, Shape B):
```json
{
  "message": "poc extension approved",
  "data": {
    "id": 7,
    "organization_id": 308219,
    "evaluation_ends_at": "2026-08-15T00:00:00Z",
    "extension_used_at": "2026-07-09T10:00:00Z",
    "grace_ends_at": null,
    "converted_organization_id": null,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

Errors: 422 *"This PoC has already used its one allowed extension."*; 422 *"This PoC is past its grace period and can no longer be extended."*; 404 if the organization has no PoC lifecycle at all (e.g. it's not a PoC org).

**POST `admins/billing/organizations/{organizationId}/poc/convert`** — convert to production.

Requires `billing.manage-catalog` (super_admin only).

Request body:
| Field | Type | Required |
|---|---|---|
| `name` | string | yes |
| `email` | string | yes |
| `fleet_size` | integer | yes |
| `industry` | string | yes |

Success (200, Shape B):
```json
{
  "message": "poc converted",
  "data": { "new_organization_identifier": 991234 }
}
```

Note the response only returns the new organization's identifier — fetch the full new organization record separately (`GET admin/organizations` filtered/searched, or a direct show endpoint) if you need to display it or navigate to it. This action re-parents ALL of the original PoC org's vehicles, drivers, devices, users, and telemetry data to the new organization, and marks the original org as `type=converted`/`billing_status=cancelled`.

### 6.7 Refunds

**POST `admins/billing/transactions/{transactionId}/refund`**

Requires `billing.money` (finance or super_admin).

Request body: `amount` (number, Naira, required, min 0.01), `reason` (string, required, max 500 chars).

Success (201, Shape B):
```json
{
  "message": "refund initiated",
  "data": {
    "id": 12,
    "subscription_transaction_id": 5001,
    "organization_id": 308219,
    "provider": "paystack",
    "provider_reference": "PSK_a1b2c3",
    "provider_refund_reference": null,
    "amount_minor": 450000,
    "currency": "NGN",
    "status": "pending",
    "idempotency_key": "refund:5001:450000",
    "reason": "Customer requested cancellation refund",
    "requested_by_admin_id": 3,
    "created_at": "...",
    "updated_at": "..."
  }
}
```
Note `amount_minor` is in kobo here (this endpoint returns the raw database row, unconverted) — divide by 100 to display Naira for this one specific endpoint's response, unlike everywhere else in this document. `status` will be `pending`, `settled`, or `failed`; it only becomes `settled` after the provider's webhook confirms it — poll or re-fetch rather than treating 201 as "money has moved."

Sending the exact same transaction + amount combination again is safe — the backend returns the original refund record instead of creating a duplicate.

Errors: 422 *"Only successful transactions can be refunded."*; 422 *"Refund amount exceeds the refundable balance for this transaction."*; 404 if the transaction ID doesn't exist.

### 6.8 Credit Notes

**POST `admins/billing/organizations/{organizationId}/credit-notes`**

Requires `billing.money`.

Request body: `amount` (number, Naira, required, min 0.01), `reason` (string, required, max 500), `reference` (string, optional, max 100 — an idempotency key; reusing it returns the original credit note rather than creating a second one).

Success (201, Shape B):
```json
{
  "message": "credit note issued",
  "data": {
    "id": 8,
    "invoice_id": null,
    "organization_id": 308219,
    "amount_minor": 500000,
    "reason": "Service outage compensation",
    "reference": "TICKET-1234",
    "issued_by_admin_id": 3,
    "created_at": "...",
    "updated_at": "..."
  }
}
```
`amount_minor` is kobo here too — same caveat as refunds above.

Error: 404 if the organization doesn't exist.

### 6.9 Anonymization

**POST `admins/billing/organizations/{organizationId}/anonymize`**

Requires `billing.manage-catalog` (super_admin only).

No request body.

Success (200, Shape B): `{ "message": "organization anonymized" }` — no `data` key at all.

Error: 404 if the organization doesn't exist.

### 6.10 Discounts

**POST `admins/billing/organizations/{organizationId}/discounts`**

Requires `billing.money`.

Request body:
| Field | Type | Required | Notes |
|---|---|---|---|
| `target` | string | yes | `base`, `lot`, or `all` |
| `lot_id` | integer | required only if `target` is `lot`; must be omitted otherwise | must reference an existing subscription lot |
| `kind` | string | yes | `percent_bps` (basis points, e.g. 1500 = 15%) or `fixed_minor` (a fixed amount — unlike every other money field in this document, this one is **kobo, not Naira**: the backend uses `value` as-is against internal kobo subtotals with no conversion step, so for a ₦5,000 discount you must send `500000`, not `5000`) |
| `value` | integer | yes | min 1. Basis points (1–10000) for `percent_bps`; kobo for `fixed_minor` |
| `starts_at` | date | yes | |
| `ends_at` | date | no | must be after `starts_at` if provided; omit for open-ended |

Success (201, Shape B):
```json
{
  "message": "discount created",
  "data": {
    "id": 4,
    "organization_id": 308219,
    "target": "base",
    "lot_id": null,
    "kind": "percent_bps",
    "value": 1500,
    "starts_at": "2026-07-09",
    "ends_at": null,
    "created_by_admin_id": 3,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

Errors: 422 *"Discount target must be base, lot, or all."*; 422 *"Lot-targeted discounts require a lot_id."*; 422 *"lot_id is only valid for lot-targeted discounts."*; 422 *"Discount kind must be percent_bps or fixed_minor."*

### 6.11 Reconciliation Mismatches

**GET `admins/billing/reconciliation/mismatches`**

Requires `billing.money`.

Query parameter: `status` (optional filter).

Success (200, Shape B):
```json
{
  "message": "reconciliation mismatches",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 2,
        "provider": "paystack",
        "provider_settlement_id": 15,
        "subscription_transaction_id": 5001,
        "kind": "amount_mismatch",
        "expected_minor": 450000,
        "actual_minor": 449500,
        "status": "open",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "...": "this is Laravel's native paginator shape (current_page/last_page/total/per_page/links), NOT the pagination shape used elsewhere in this document — do not reuse the same pagination-parsing code you write for other list endpoints"
  }
}
```
`kind` is one of `amount_mismatch`, `unknown_settlement`, `missing_settlement`. `status` is `open` by default; there is no endpoint to change it (see Section 8).

### 6.12 Analytics

**GET `admins/subscriptions/analytics/summary`**, **`.../analytics/status-distribution`**, **`.../analytics/mrr`** exist but their exact response shapes were not part of this investigation — inspect them directly (e.g. via a authenticated request in a REST client) before building charts against them, rather than assuming a shape.

---

## 7. Error Scenarios Checklist

For every write action in this document, the UI must handle at minimum:
- **401** — session expired; redirect to login.
- **403** — wrong role; show a clear "you don't have permission for this action" message (this is your signal that a role check was missed in the UI itself, if the control shouldn't have been reachable at all).
- **404** — the organization/transaction/plan/addon/subscription referenced no longer exists; refresh the list.
- **422** — validation or business-rule failure; the message and errors array are always populated with human-readable text — show it directly, don't write your own generic "something went wrong" copy for this case.
- **500 / 503** — the 503 case (`DB_SERIALIZATION_FAILURE`) is specifically safe to retry once automatically; a 500 is not.

---

## 8. Known Backend Gaps — Read Before Building

These are real, verified gaps in the current backend. Do not build UI that assumes they're already solved — either request the backend change first, or scope the UI around the limitation and say so.

1. **Role enforcement is missing on several endpoints.** `admin/organizations` (list, create, suspend, unsuspend, delete) and everything under `admins/subscriptions/*` (plans, addons, features CRUD, subscription activation) currently only check "is this any authenticated admin" — there is no `Gate::authorize` call distinguishing super_admin/finance/support on these specific routes. The UI's role-based control hiding is the only thing currently preventing a support user from, say, editing a plan's price.
2. **`OrganizationResource` does not expose `type` or `billing_status`.** The organization list/detail response has no field telling you whether an org is PoC/Trial/Production/Converted, or whether its billing status is Active/Suspended/Cancelled. You cannot build the PoC-specific UI (Section 4.5) or a billing-status badge without this being added to the API response first.
3. **No filter for organization type or billing status** on `GET admin/organizations` — only free-text search and a generic `status` field (which refers to a different, older status concept, not billing status).
4. **Plan usage-quota fields exist in the database but are not exposed via the API.** The Plan model has SMS-included, SMS-overage-rate, API-calls-included, and storage-included/overage fields, but neither the create/update plan request validation nor the plan response includes them. A quota-management UI cannot be built until these are added to the request/response contracts.
5. **No list, edit, or delete endpoint for contract discounts** — only creation. If a "view/manage existing discounts" screen is wanted, it needs to be added to the backend first.
6. **No "resolve" action for reconciliation mismatches** — the list is read-only. Confirm the intended resolution workflow with the backend/finance team before promising a "mark resolved" button.
7. **No admin-specific invoice endpoint** — invoice routes are under the client-facing, tenant-scoped `subscriptions/invoices` path. Confirm how backoffice roles are meant to reach a given organization's invoices before building Section 4.7.
8. **The `billing.operational` gate is defined but unused** — it exists in the backend's authorization setup but no endpoint currently checks it. If certain read-only endpoints are meant to be support-visible-only-through-this-gate, that wiring doesn't exist yet.
9. **Credit note responses don't include the organization's running credit balance** — you'll need a separate way to show "current credit balance" on the organization page if that's wanted.
10. **The discount endpoint's `fixed_minor` kind takes kobo, not Naira** — confirmed by reading `DiscountService::discountMinorFor()`, which uses the submitted `value` as-is against internal kobo amounts. Every other money field in this entire API is Naira; this one field is the sole exception. Build the form to convert Naira-entered-by-the-operator to kobo before submitting, and label the input clearly so operators aren't misled by the pattern used everywhere else.
