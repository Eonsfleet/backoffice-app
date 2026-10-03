'use client'

import { useSearchParams } from 'next/navigation'

export function useUrlListState() {
  const params = useSearchParams()
  const search = params.get('q') ?? ''
  const status = params.get('status') ?? 'all'
  const pageValue = Number(params.get('page') ?? 1)
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1
  function update(values: Record<string, string | number | null>) {
    const url = new URL(window.location.href)
    for (const [key, value] of Object.entries(values)) {
      if (value === null || value === '' || (key === 'status' && value === 'all') || (key === 'page' && value === 1)) url.searchParams.delete(key)
      else url.searchParams.set(key, String(value))
    }
    // Next's native history integration updates useSearchParams without a route reload.
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }
  return {
    search, status, page, update,
    getFilter: (name: string, fallback = 'all') => params.get(name) ?? fallback,
    setFilter: (name: string, value: string) => update({ [name]: value === 'all' ? null : value, page: 1 }),
    setSearch: (value: string) => update({ q: value, page: 1 }),
    setStatus: (value: string) => update({ status: value, page: 1 }),
    setPage: (value: number) => update({ page: value }),
    reset: () => update({ q: null, status: null, page: null }),
  }
}
