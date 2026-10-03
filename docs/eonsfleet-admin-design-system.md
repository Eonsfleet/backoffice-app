# Eonsfleet admin design system

Status: implementation baseline for the updated rebuild brief, 3 October 2026. This is a design decision record, not a claim that every requested module is complete.

## Direction and evidence

Build a compact enterprise operations console for support, fleet operations, finance and platform administrators. Keep the existing Next.js, Radix/shadcn, Tailwind, TanStack and Geist foundation. Brand review: the sibling customer app uses a black wordmark and neutral primary tokens; the original backoffice used indigo, while the current rebuild uses teal and a navy sidebar. No authoritative brand guide was supplied. Retain the current teal accent and recognizable Eonsfleet name while using semantic tokens for state. Do not describe this palette as an approved corporate identity.

UI/UX Pro Max is installed at `.agents/skills/ui-ux-pro-max`. Python is unavailable and has not been installed; the generator has not run. The skill's built-in web guidance and local datasets inform this baseline: styles 1 (Minimalism & Swiss Style) and 28 (Data-Dense Dashboard); UX 5 (deep links), 9 (reduced motion), 28 (focus), 36 (contrast), 41 (keyboard), 43 (labels), 44 (announced errors), 55 (inline errors). Decorative glass and oversized marketing typography are unsuitable for this product. Generator output and browser QA must be recorded separately when available.

## Tokens

Primitive spacing follows 4, 8, 12, 16, 24, 32 pixels. Semantic tokens live in `app/globals.css`: background, foreground, card, muted, border, primary, ring and status-success/warning/error/info/neutral with paired surfaces. Components consume semantic Tailwind classes, rather than introducing a new palette per screen. Light surfaces are near-white; dark surfaces charcoal; the sidebar is navy. Primary actions use teal. State text uses darker foregrounds on pale surfaces in light mode and lighter text on dark surfaces in dark mode.

Geist Sans remains the interface font; Geist Mono or tabular numbers are appropriate for identifiers and numeric measurements. Body/table text is 14px, supporting text 12px, section headings 16px, page headings 24px. Use readable line height and wrap names/emails; exact identifiers must be available without hover. Radius is 6–10px for controls/cards, pill for status. Prefer borders to shadows; reserve shadows for overlays. Lucide icons are 16–20px, decorative icons hidden from assistive technology, icon buttons named.

## Layout and navigation

Seven groups: Overview, Customers, Fleet operations, Operations, Platform, Governance and System. Only real implemented routes appear. Permission filtering and direct-route guards must agree; API authorization remains authoritative. Keep a collapsible desktop sidebar and a mobile sheet. Header contains breadcrumbs, global search, notifications and theme control; administrator identity remains available in the sidebar. Main content has a keyboard skip target.

At 1440px, use a sidebar and broad workspace; at 1024px use fewer KPI columns; at 768px allow filter controls to wrap; at 390px switch to mobile navigation and stacked actions. Contain horizontal scrolling inside tables rather than the entire page. Drawers use the viewport width on phones and a bounded width on desktop. Never hide a primary action solely because the screen is small.

## Tables and filters

Use DataTable for pagination, errors, skeletons, column visibility and sorting. Table headers stick within a bounded scroll container; sort controls are native buttons with `aria-sort` on column headers. Sorting is explicitly labeled as within the returned page until a verified server sort contract exists. Compact is the default density; comfortable density is available. Column menus use readable headers. Preserve the toolbar on failures so filters can recover a request. Visible-column counts determine empty-state colspan and skeletons. Numeric cells align right and use tabular numbers.

Use FilterBar for visible search labels, common filters, active removable chips and reset. Store list state in URL parameters when integrated; preserve unrelated parameters, back/forward navigation and focused inputs. URL changes must not remount the entire route. Advanced filters require actual server-supported parameters. Do not add a nonfunctional filter or export control.

## Entities and forms

Entity headers show a name, status, copyable ID, tenant context and the most useful metadata. Related tabs fetch when selected. Retain the selected tab after mutation. Separate dangerous actions and explain effects before confirmation. Use shared CopyValue and Timestamp for exact values; timestamps show Africa/Lagos (WAT) explicitly and handle invalid/missing data.

Forms have visible associated labels, required indicators, field-specific validation with aria-describedby, and a persistent error message. Retain edits after failures; disable double submission. Drawers preserve keyboard focus through Radix. Template editing warns before discarding changes and preserves placeholders as literal text. Resetting a notification template marks it for restoration on the next catalogue sync; it does not immediately replace the text.

## State, charts and feedback

StatusBadge maps domain states to five semantic variants: success, warning, error, info and neutral. Every badge contains a text label and a dot. Unknown values remain visible as neutral; missing data is Unknown rather than zero. Chart colors are semantic, with legend labels and a numeric nonvisual equivalent. Use charts only for meaningful comparisons; avoid adding unlike or overlapping categories into a donut total. Disable decorative animation; respect reduced motion globally.

Loading uses layout-preserving skeletons. Errors announce actionable messages and retry; empty states distinguish no results from unavailable data. Mutation failures remain near the form as well as in transient feedback. Copy actions provide success/failure feedback. Do not render raw infrastructure error messages, provider credentials or notification HTML.

## Acceptance and QA

Check keyboard access, visible focus, sticky elements not obscuring focus, labels, announced errors and 4.5:1 normal text contrast. Inspect actual browser rendering at desktop, laptop, tablet and phone widths, both themes, long values, missing fields, failed requests, empty lists and large counts. Test fixtures belong only to QA interception/tests, never production data paths. Static checks do not substitute for authenticated integration or browser review. Record results and outstanding gaps in `docs/rebuild-audit.md` and `docs/screen-inventory.md`.
