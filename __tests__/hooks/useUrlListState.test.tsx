import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUrlListState } from '@/hooks/useUrlListState'

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }))
describe('URL list state', () => {
  beforeEach(() => window.history.replaceState(null, '', '/organizations'))
  it('preserves unrelated context and the hash while changing filters', () => {
    window.history.replaceState(null, '', '/organizations?tab=activity&page=5#records')
    const { result, rerender } = renderHook(() => useUrlListState())
    act(() => result.current.setSearch('North & West'))
    rerender()
    expect(result.current.search).toBe('North & West')
    expect(result.current.page).toBe(1)
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('activity')
    expect(window.location.hash).toBe('#records')
    act(() => result.current.setStatus('suspended'))
    rerender()
    expect(result.current.search).toBe('North & West')
    expect(result.current.status).toBe('suspended')
  })
  it('clears list filters while retaining unrelated parameters', () => {
    window.history.replaceState(null, '', '/organizations?q=fleet&status=active&page=3&tab=overview')
    const { result, rerender } = renderHook(() => useUrlListState())
    act(() => result.current.reset())
    rerender()
    expect(window.location.search).toBe('?tab=overview')
    expect(result.current.page).toBe(1)
    expect(result.current.status).toBe('all')
  })
  it('ignores invalid page numbers and resets page for secondary filters', () => {
    window.history.replaceState(null, '', '/organizations?page=-10')
    const { result, rerender } = renderHook(() => useUrlListState())
    expect(result.current.page).toBe(1)
    act(() => result.current.setFilter('organization', '42'))
    rerender()
    expect(result.current.getFilter('organization')).toBe('42')
    expect(new URLSearchParams(window.location.search).has('page')).toBe(false)
  })
})
