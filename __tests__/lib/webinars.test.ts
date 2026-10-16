import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/client', () => ({ api: {} }))

import { normalizeRegistrations } from '@/features/webinars/api'
import { filterRegistrants, registrantsToCsv } from '@/features/webinars/lib'
import { canAccessNavigation, getRouteItem } from '@/lib/navigation'

const body = { data: { total: 2, phone_numbers: ['+234801'], users: [
  { id: 1, name: null, first_name: 'Ada', last_name: 'Obi', email: 'ada@x.com', phone: '+234801', company: '=SUM(A1)', country: 'Nigeria' },
  { id: 2, name: 'Kofi A', email: 'kofi@y.com', country: 'Ghana' },
] } }

describe('webinar registrations', () => {
  const { users, total, phone_numbers } = normalizeRegistrations(body)
  it('normalizes the response and derives a missing name', () => {
    expect(total).toBe(2)
    expect(phone_numbers).toEqual(['+234801'])
    expect(users[0].name).toBe('Ada Obi')
    expect(users[1].phone).toBeNull()
  })
  it('survives a malformed response', () => {
    expect(normalizeRegistrations(null)).toEqual({ total: 0, phone_numbers: [], users: [] })
  })
  it('filters by search and country', () => {
    expect(filterRegistrants(users, 'kofi', 'all')).toHaveLength(1)
    expect(filterRegistrants(users, '', 'Nigeria')[0].id).toBe(1)
  })
  it('neutralizes formulas in CSV but keeps phone plus signs', () => {
    const csv = registrantsToCsv(users)
    expect(csv).toContain("'=SUM(A1)")
    expect(csv).toContain(',+234801,')
  })
  it('gates the nav entry behind the webinar permission', () => {
    const user = (role: string, permissions?: string[]) => ({ id: '1', name: 'T', email: 't@x.com', avatar: null, last_login: null, role, permissions })
    expect(getRouteItem('/webinars')?.href).toBe('/webinars')
    expect(canAccessNavigation(user('super_admin'), getRouteItem('/webinars')!)).toBe(true)
    expect(canAccessNavigation(user('support'), getRouteItem('/webinars')!)).toBe(false)
    expect(canAccessNavigation(user('custom', ['admin.webinars.view']), getRouteItem('/webinars')!)).toBe(true)
  })
})
