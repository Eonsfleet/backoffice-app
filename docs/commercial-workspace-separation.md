# Subscriptions and billing separation

Subscriptions owns subscriber accounts, POC/production lifecycle, the plan and add-on catalogues, and subscription analytics. Its overview focuses on account totals, status distribution and subscriber accounts. Existing context-specific subscription operations, including capacity purchases and renewals, remain in the subscriber detail workflow with their existing authorization.

Billing & payments has a separate overview, payment history, invoices and reconciliation. Payment/invoice record counts come from API pagination totals; recent records are previews, not claimed outstanding balances or collection totals. There is no new financial aggregation API. Navigation links between the two workspaces respect the viewer's permissions, and local navigation wraps on mobile.

| Purpose | Canonical route | Previous route |
| --- | --- | --- |
| Subscription overview | `/subscriptions` | Same |
| Subscriber accounts | `/subscriptions/subscribers` | Same |
| Plan catalogue | `/subscriptions/plans` | Same |
| Add-on catalogue | `/subscriptions/addons` | Same |
| Subscription analytics | `/subscriptions/analytics` | Same |
| Billing overview | `/billing` | Previously redirected to Transactions |
| Payments | `/billing/payments` | `/subscriptions/transactions` |
| Invoices | `/billing/invoices` | `/subscriptions/invoices` |
| Reconciliation | `/billing/reconciliation` | `/subscriptions/reconciliation` |

Old finance URLs redirect while retaining all query parameters, including repeated values. Both canonical and legacy routes use the appropriate billing permission; reconciliation requires `admin.billing.money`, matching the API's finance/super-admin gate. Support can view the billing overview, payments and invoices, but does not see or fetch reconciliation.

Backend contracts were confirmed in `../api/app/Http/Controllers/Api/v1/Backoffice/AdminSubscriptionController.php` and `BillingActionController.php`. Payment/invoice search now sends `q` to the server. Payments send `payment_method`, replacing the ignored `gateway` field. Filters and page persist in the URL; failed requests show retry within the workspace. Reconciliation sends `page` and reads Laravel's actual paginator metadata. CSV export keeps the existing all-record behavior and is labelled **Export all payments**. Invoice PDF downloads retain the existing endpoint and behavior.

No backend routes, payment calculations or database state were changed for this separation. The finance components now live in `features/billing/components`; shared API functions remain in `features/subscriptions/api.ts` because subscription detail workflows also use them.

Validation passed: the production build (including lint and TypeScript checks), 15 focused tests, and nine browser checks using isolated API fixtures. Browser checks covered redirects, filters, pagination, permissions, empty/error states and mobile dark mode, with no page errors or document overflow. Results are recorded in `docs/qa/commercial-workspace-results.json`. Live backend integration was not exercised by these fixture checks.
