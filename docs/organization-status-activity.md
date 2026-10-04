# Organization account status and activity

New manual organizations receive the `active` status-table ID in `OrganizationService::createOrganization`, covering both POC and production provisioning. Existing organizations are not bulk modified. The directory and detail header now show the account status, with “Not set” for a missing value, independently of the subscription status.

Authorized admins can use **Change status** from the directory or detail page to choose active, inactive or suspended. `PATCH /v1/admin/organizations/{id}/status` is protected by `auth:admin`, validates those three slugs, resolves a primary key or public identifier, clears organization caches and records a tenant-scoped status event with the admin actor. The frontend uses the same organization-suspend permission as the existing suspend/reactivate actions. A failed save retains the selection and displays an error.

## Confirmed organization activity endpoint

- Route: `GET /v1/admin/organizations/{id}/activity-log` in `../api/routes/api/v1/organizations.php`.
- Controller: `OrganizationActivityLogController::index`, with `resolveContext` translating the selected organization to its public identifier.
- Query: `ActivityLogService::buildActivityQuery` filters Spatie `activity_log.org_id` by that identifier. An admin viewer is not used as a causer filter; events by different actors within the organization are included.
- Response: activity entries include `changed_by` and paginated `meta`. The detail tab addresses the organization's primary key explicitly, preserves pagination, and displays request failures with retry instead of a false empty state.

## Gap to close: complete organization audit coverage

The organization activity endpoint reads Spatie activity records. The platform's separate `audit_logs` and `platform_admin_activity_log` stores are returned by `/v1/admin/audit-logs`; they are not combined into this organization activity feed. Its `organization_id` filter expects a resolved organization primary key. `LogAuditActivity::organizationId` does not capture the generic `{id}` used by organization routes, so some admin requests have no organization attribution. `AuditLogger` writes billing/domain records without a tenant column or explicit organization payload. Organization creation itself is not automatically written to the Spatie feed.

Before calling this a complete organization audit trail, resolve tenant attribution from route/resource context at write time and provide a paginated combined organization feed that includes all three stores, without filtering to the viewing admin or allowing records from other organizations. Include regressions for the same admin acting on two organizations, multiple actors on one organization, billing events, missing attribution and deleted subjects. The existing scoped operational endpoint is present and usable; full combined coverage remains a backend gap.

## Verification

Type checks, lint and the production build pass. Four status/activity frontend contract tests plus 13 organization creation tests pass. Three database-independent API tests verify allowed statuses, organization filtering without an actor filter, and displaying a change from null status. API syntax checks pass. Database-backed organization regression tests were added but have not been run successfully; the local API integration setup stalled during the preceding update.

`scripts/qa/organization-status-activity.mjs` checks the directory's unset status independently of an active subscription, status save failure and recovery, events by two actors, switching organizations, and activity request failure with retry. Its intercepted fixture run records no page errors; screenshots and `organization-status-activity-results.json` are in `docs/qa`. This does not verify a live API/database. Release both the frontend and sibling API changes together.
