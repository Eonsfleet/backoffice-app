/**
 * App-wide constants.
 *
 * Centralised here so magic numbers in query configs, pagination, and
 * debounce timers can be changed in one place.
 */

// ─── Pagination ───────────────────────────────────────────────────────────────

/** Default number of rows per page across all data tables. */
export const DEFAULT_PAGE_SIZE = 15

// ─── TanStack Query stale times (ms) ─────────────────────────────────────────

/** Real-time or frequently-changing data (org list, device list, user list). */
export const STALE_SHORT = 30_000

/** Semi-static data (metrics, summaries). */
export const STALE_MEDIUM = 60_000

/** Rarely-changing reference data (dropdown lists, plans, features). */
export const STALE_LONG = 120_000

// ─── Debounce ─────────────────────────────────────────────────────────────────

/** Default debounce delay for search inputs (ms). */
export const DEBOUNCE_SEARCH = 300
