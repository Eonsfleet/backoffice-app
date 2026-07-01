import { describe, it, expect } from 'vitest'
import { normalizePaginated } from '@/lib/api/utils'

describe('normalizePaginated', () => {
  it('returns an empty page for null input', () => {
    const result = normalizePaginated(null)
    expect(result.data).toEqual([])
    expect(result.meta.total).toBe(0)
  })

  it('returns an empty page for undefined input', () => {
    const result = normalizePaginated(undefined)
    expect(result.data).toEqual([])
  })

  it('returns an empty page for a non-object input', () => {
    expect(normalizePaginated('bad').data).toEqual([])
    expect(normalizePaginated(42).data).toEqual([])
  })

  it('normalises Shape A — standard Laravel envelope', () => {
    const input = {
      data: [{ id: 1, name: 'Acme' }],
      meta: { current_page: 2, last_page: 5, per_page: 15, total: 75 },
    }
    const result = normalizePaginated(input)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({ id: 1, name: 'Acme' })
    expect(result.meta.current_page).toBe(2)
    expect(result.meta.last_page).toBe(5)
    expect(result.meta.total).toBe(75)
  })

  it('unwraps an outer API envelope before normalising', () => {
    const input = {
      message: 'OK',
      data: {
        data: [{ id: 7 }],
        meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
      },
    }
    const result = normalizePaginated(input)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({ id: 7 })
  })

  it('normalises Shape B — custom resource wrapper with pagination', () => {
    const input = {
      organizations: [{ id: 1, attributes: { name: 'Org A' } }],
      pagination: { current: 1, lastPage: 3, perPage: 10, total: 25 },
    }
    const result = normalizePaginated(input)
    expect(result.data).toHaveLength(1)
    expect(result.meta.last_page).toBe(3)
    expect(result.meta.total).toBe(25)
  })

  it('merges attributes and relationships in Shape B items', () => {
    const input = {
      items: [
        {
          id: '99',
          attributes: { name: 'Widget' },
          relationships: { org: { id: 5 } },
        },
      ],
      pagination: { current: 1, lastPage: 1, perPage: 10, total: 1 },
    }
    const result = normalizePaginated<{ id: string; name: string }>(input)
    expect(result.data[0].name).toBe('Widget')
  })

  it('provides sensible meta defaults when meta is absent', () => {
    const input = { data: [{ id: 1 }] }
    const result = normalizePaginated(input)
    expect(result.meta.current_page).toBe(1)
    expect(result.meta.last_page).toBe(1)
    expect(result.meta.total).toBe(1)
  })
})
