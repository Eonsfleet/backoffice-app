import type { PaginatedResponse } from '@/types/api'

/**
 * Normalises the two paginated response shapes the backend emits:
 *
 * Shape A — standard Laravel:
 *   { data: [...], meta: { current_page, last_page, per_page, total } }
 *
 * Shape B — custom resource wrapper:
 *   { <resource>: [...], pagination: { current, lastPage, perPage, total } }
 *
 * Both may arrive already unwrapped (inner payload) OR still inside the
 * outer API envelope { message, data: <inner>, status, meta }.
 */
const EMPTY_PAGE: PaginatedResponse<never> = {
  data: [],
  meta: { current_page: 1, last_page: 1, per_page: 0, total: 0 },
}

export function normalizePaginated<T>(axiosData: unknown): PaginatedResponse<T> {
  if (axiosData === null || axiosData === undefined || typeof axiosData !== 'object') {
    console.warn('normalizePaginated: received non-object response', axiosData)
    return EMPTY_PAGE as PaginatedResponse<T>
  }

  const body = axiosData as Record<string, unknown>

  // Unwrap outer envelope if present
  const inner: Record<string, unknown> =
    body.data !== undefined && !Array.isArray(body.data) && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : body

  // Shape A: standard { data: [...], meta: {...} }
  if (Array.isArray(inner.data)) {
    return {
      data: inner.data as T[],
      meta: (inner.meta ?? {
        current_page: 1,
        last_page: 1,
        per_page: (inner.data as unknown[]).length,
        total: (inner.data as unknown[]).length,
      }) as PaginatedResponse<T>['meta'],
    }
  }

  // Shape B: custom { <resource>: [...], pagination: {...} }
  const arrKey = Object.keys(inner).find(
    (k) => k !== 'meta' && k !== 'pagination' && Array.isArray(inner[k])
  )
  if (arrKey) {
    const arr = inner[arrKey] as Record<string, unknown>[]
    const pg = inner.pagination as Record<string, unknown> | undefined
    return {
      data: arr.map((o) => {
        if (!o.attributes) return o as T
        // Merge attributes + relationships (when relationships is a plain object, not array)
        const rels =
          o.relationships && !Array.isArray(o.relationships) && typeof o.relationships === 'object'
            ? (o.relationships as object)
            : {}
        return { id: o.id, ...(o.attributes as object), ...rels } as T
      }),
      meta: {
        current_page: (pg?.current as number) ?? 1,
        last_page:    (pg?.lastPage as number) ?? 1,
        per_page:     (pg?.perPage as number)  ?? arr.length,
        total:        (pg?.total as number)    ?? arr.length,
      },
    }
  }

  // Fallback: already the right shape
  return inner as unknown as PaginatedResponse<T>
}
