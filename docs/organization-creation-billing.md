# Organization creation billing choices

Organization creation now offers POC and production. Select a catalogue plan for either type.

- POC accepts a whole-number evaluation period from 15 through 30 days, defaulting to 30. The UI sends `billing_type: poc`, `plan_id`, and `evaluation_days`, without a billing cycle. The API keeps its existing monthly internal cycle default and sets the evaluation end from the selected day count.
- Production offers monthly or yearly billing. The UI sends `billing_type: production`, `plan_id`, and `billing_cycle`, without evaluation days. The API binds a production subscription using the existing first-plan service in the same transaction as organization creation. It creates no POC lifecycle, purchased capacity, or invoice. Asset capacity must be purchased from Billing before vehicles can be onboarded. The existing `billing.money` gate permits finance and super-admin actors.
- Editing organization details validates only those details, including organizations that have no subscription. Billing changes remain separate.

The 15–30 range interprets the user's “15 - 30 days” as the allowed interval. Backend changes are in the sibling `../api` repository, so both applications must be released together for production creation to work.

Validation: 13 frontend schema/payload tests, 12 database-independent API validation tests, PHP syntax checks, lint/type checks, and a production build. Three fixture browser scenarios verify POC and both production cycles; `scripts/qa/organization-billing.mjs` intercepts API calls and checks the outgoing requests. Database-backed API regression tests were added to `tests/Feature/OrganizationTest.php` in the API repository, but the local integration test process stalled and was stopped. Live database provisioning is not yet verified.

The application also uses the requested blue primary palette. Light primary/foreground contrast is approximately 6.42:1, dark primary/foreground 7.02:1, and dark sidebar selected-item contrast 4.95:1. Semantic success, warning and error colors retain their meanings.
