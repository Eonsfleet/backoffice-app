# Backoffice rebuild audit

The supplied rebuild specification is the product brief. Existing API contracts and server authorization remain authoritative.

## Existing application

Next.js App Router, React Query, Zustand authentication, Axios, Tailwind, Radix, TanStack Table, Zod forms and Recharts provide a reusable foundation. Authentication bootstrap and middleware are retained. **Correction to the initial audit:** backend source is available in the sibling `../api` repository. The updated audit inspects route/controller/resource/service code there; no backend files have been modified.

| Area | Audit finding |
| --- | --- |
| Dashboard | API-backed totals, fleet/device analytics, subscription summary and audit feed. Service readiness is now connected to the verified health contract; absent counts remain unavailable. |
| Organizations | API-backed CRUD, status filters, pagination, confirmations, activity and plan changes. Frontend action gates and scoped relationships added; full health and legacy form review remain incomplete. |
| Users / vehicles / devices | API-backed workspaces, forms, imports and device assignment. Shared tables and core URL filters improved; detailed legacy form, import and map review remain. |
| Commercial | Extensive integrated plans, addons, subscribers, invoices, transactions, reconciliation and analytics. Retain money/catalog permission gates and all existing billing behavior. |
| Governance | Role editor and audit workspace exist. Admin users now have their own workspace. Permission editor and hook use different vocabularies; do not infer equivalence without backend verification. |
| Notifications / settings | Integrated notification center and settings; retain existing API requests. |
| Incomplete | Full customer health and onboarding; driver compliance/history; global clusters/geofences; installation jobs; complete installer directory; vendors; incidents/support/requisitions; generated reports/integrations; telemetry/realtime/delivery/job history; flags/reference data. |
| Shared UI | Shared tokens, accessible sorting, retry states and grouped navigation applied. Remaining legacy forms/charts still need systematic review. |

## Implementation approach

Preserve business logic and installed dependencies. Rebuild navigation and visual foundation first; use existing permission keys, hide inaccessible destinations and guard direct navigation before child queries mount. Improve the platform overview with existing data, honest unavailable states and filtered drill-downs. Extend search only through existing bounded server list APIs. Improve organization overview with tenant-scoped list queries. Missing contracts must remain documented gaps, never fabricated live data.

## Verification limits

Local type checking, lint, tests and production compilation validate frontend changes. Fixture-based browser QA validates rendering and interactions separately. Live integration, actual permission vocabulary and authenticated backend behavior require the running API and an authorized account. Missing modules are not complete under the specification's definition of done.

## Initial frontend changes (followed by updated-spec changes below)

- Shared visual foundation: dark grouped sidebar, teal accents, Geist typography, quieter page backgrounds, consistent page headings and compact linked metrics.
- Navigation follows implemented customer, fleet, operations, governance and system workspaces. Unauthorized routes do not mount their child workspaces while the authoritative profile resolves or access is denied.
- Rebuilt platform overview uses existing platform totals, device and subscription metrics, organization activity and audit history. Refresh, skeletons, retry and permission states are explicit. Unknown metrics remain unknown. Service health is explicitly unavailable.
- Global search uses bounded existing list APIs for organizations, devices, vehicles, customer users and internal administrators. Queries and quick navigation respect workspace access; results identify the organization or record, and keyboard navigation is supported.
- URL search/status parameters work for core list drill-downs. Core list searches are debounced; shared tables support errors, retries, descriptive empty states and keyboard sorting within the returned page.
- Organization details add server-paginated, tenant-scoped users, vehicles and devices. Organization actions, plan changes, device mutations and catalog editing respect existing permissions or conservative super-admin restrictions where a granular contract is absent.
- Customer Health uses available account/subscription states and a disclosed 90% asset-limit threshold. It is a partial health view; offline rates, payments, activity and installation risks still require additional contracts.
- Internal administrator management is separated from customer users and accessible at its own route. Existing forms, imports, billing workflows and API paths are preserved.
- Added regression coverage for navigation, denied routes not mounting queries, absent/zero metrics, and explainable customer-health signals. Full suite: 82 tests passing.

## Remaining integration work

The verified findings below identify actual contracts and remaining scope limitations. Dashboard date/organization/plan filtering, saved views, additional account relationships and full health aggregation remain unfinished. The existing role editor uses a different permission vocabulary from the legacy hook; server-authoritative mapping requires backend confirmation. No impersonation or credentials UI was added.

## Updated-spec implementation

- Design decision record: `eonsfleet-admin-design-system.md`; route-by-route audit: `screen-inventory.md`. UI/UX Pro Max is installed. Python is unavailable, so the generator has not run or been represented as validated output. Skill Quick Reference and relevant local style/UX/framework datasets were inspected; Next 16-specific guidance is not applied to this Next 15 application.
- Seven navigation groups with verified screens. Shared tables now have semantic sort buttons/aria-sort, explicit page-local sorting, sticky headers, density, readable column-menu labels, visible-column skeletons, contained scroll and retained filters on errors.
- Semantic status tokens for both themes, text-and-dot badges, a main-content skip link and global reduced-motion handling. Shared FilterBar, CopyValue and explicit WAT Timestamp components.
- Organization, device, vehicle, customer-user, internal-admin and subscriber search/filter/page state now persists in the URL without remounting the route. New directory/catalogue screens use the same pattern. Hardware/APN tabs and some other legacy lists still need complete URL synchronization.
- Real platform-health page and overview widget: `/health` readiness checks including HTTP 503 unhealthy payloads, redacted structured values and explicit snapshot timestamps.
- Real notification-template list/edit/reset: validated lengths and labels, persistent save errors, discard protection, literal placeholder preservation and accurate next-catalogue-sync reset semantics. Mutation routes conservatively restricted to super admins.
- Driver directory using `/admin/users/role/driver` and vehicle detail using existing admin vehicle/sensor contracts. Driver tenant/vehicle links; vehicle metadata, status, ID and lazy sensor tab. Installer directory using the verified list endpoint, with unloaded relationships explicitly unavailable.
- Dashboard unassigned count uses device-health analytics. It no longer treats disconnected vehicles as unassigned hardware. The organization widget now accurately describes accounts created this month.
- Device connectivity chart now excludes overlapping assignment categories, disables decorative animation, uses semantic colors and includes numeric text alternatives. Sidebar labels have stronger contrast; scroll bounds preserve the header/account footer; collapsed links and mobile navigation have accessible names.
- Shared confirmations retain context and announce failures rather than closing or producing an unhandled rejection. Installed development skills are excluded from application lint; production source remains included.
- Browser QA exposed a server/client authentication startup mismatch. Initial bootstrap is now consistently pending; both cookie and no-cookie sessions resolve after hydration. Persisted sidebar preferences hydrate after mount. Missing user/vehicle statuses remain Unknown rather than defaulting to Active.

## Verified backend evidence and remaining blockers

| Capability | Source evidence | Result / limitation |
| --- | --- | --- |
| Platform health | `../api/routes/api/v1/health.php`; `HealthController::health` | Implemented `/health`; detailed runtime info is unnecessary for this UI. Queue counts reflect this probe, not authoritative job history. |
| Notification templates | `routes/api/v1/backoffice.php`; `Admin/NotificationTemplateController` | List/update/reset implemented. Reset only clears edited metadata; wording returns on catalogue sync. |
| Announcements | `Admin/NotificationAnnouncementController` | Real POST command exists; composer unfinished. Body code targets all organization identifiers when IDs omitted, despite documentation saying active organizations; targeting must be resolved before a broadcast UI. |
| Drivers | `routes/api/v1/users.php`; `UserService::getUsersByRole`; `UserRepository::usersByRole` | Read directory implemented, eagerly loaded organization/currentVehicle/cluster. Compliance workflows still incomplete. |
| Vehicle investigation | `routes/api/v1/vehicles.php`; `VehicleController`; `VehicleSensorHealthService` | Detail/sensor tab implemented from existing contracts. Scores deliberately omitted from UI; server sensor assumptions are not a physical inspection. |
| Installer directory | `AdminUserController::getInstallers`; `InstallerRepository::getInstallers`; `InstallerResource` | Endpoint exists, but repository loads neither user nor organizations; resource removes those keys. Directory must show unavailable values until backend eager loading is corrected. |
| Installer assignment | `AssignInstallerToOrganization` and `AdminUserService::assignInstallerToOrg` | Real command uses organization **identifier**, not PK. Assignment interface/jobs are unfinished; do not invent a job scheduler from this access relationship. |
| Clusters / incidents | Customer route permission middleware; cluster client access scope | Global admin scope/permission compatibility needs verification; shared helper alone bypassing client permissions does not establish middleware access. |
| Geofences | `GeofenceController::index`; `GeofencePolicy::viewAny(User $user)` | Customer-user policy cannot be assumed compatible with authenticated `Admin`; requires admin contract/policy work. |
| Vendors | `VendorService` organization-context resolver and organization-scoped repository | Customer route is not evidence of a global admin directory. |
| Generated reports | `routes/api/v1/reports.php` | Explicit `auth:client`; an admin token cannot be assumed to satisfy it. |
| Permissions | `SharedFunctions::checkPermission` | All authenticated admin accounts bypass this helper's client permission checks. Frontend restrictions are conservative UI controls, not a substitute for server authorization. |
| Support, requisitions, integration operations, telemetry/realtime/delivery/job history, flags/reference data | Full global contracts not verified in this pass | Still incomplete. Requires additional backend audit and implementation; no speculative routes added. |

The complete application rebuild is **not finished**. Backend source has narrowed the actual gaps, but the missing workflows, role model, remaining legacy-page redesign and live integration prevent a full-spec completion claim.

## Final verification of this update

- Production build succeeds, including application lint and TypeScript validation. Standalone lint/typecheck also passed during implementation; whitespace checks are clean.
- 95 tests pass across 15 files, including authentication startup, denied-route query protection, URL filter preservation/reset, keyboard sorting, health redaction/503 handling and honest missing status values. The initial parallel run hit an existing Excel test timeout under compilation load; bounded workers resolved it without changing that test's implementation.
- Compiled-browser QA: 13 responsive/state scenarios, zero page errors and zero document-level overflow. Template failure/discard/reset, lazy sensor loading, saved sidebar preferences and mobile navigation/editor interactions pass. Screenshots were visually inspected at desktop, tablet and phone widths. Semantic text-token contrast minimum: 4.65:1 in tested themes.
- Browser QA found and corrected authentication hydration mismatch, sidebar scroll compression, the template discard interaction and the mobile menu close control. Details and fixture limitations are in `qa/README.md` and `qa/browser-results.json`.
- No deployment or sibling API changes. No live-account integration was performed. UI/UX Pro Max's Python-dependent generator remains unavailable; the design decision record is a manual baseline informed by the installed skill and local datasets.
