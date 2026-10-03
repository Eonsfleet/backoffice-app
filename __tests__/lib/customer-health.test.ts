import { describe, expect, it } from 'vitest'
import { accountSignals } from '@/features/organizations/health'
import type { Organization } from '@/types/api'

const organization = (values: Partial<Organization> = {}): Organization => ({ id: '1', name: 'Customer', logo: null, status: 'active', ...values })

describe('customer health signals', () => {
  it('does not invent concerns from missing usage information', () => {
    expect(accountSignals(organization())).toEqual([])
  })
  it('explains the observed status', () => {
    expect(accountSignals(organization({ status: 'suspended' }))).toEqual(['Account suspended'])
  })
  it('flags the documented asset threshold and respects an unlimited plan', () => {
    const current_plan = { status: 'active', plan: { id: 1, name: 'Fleet', price_monthly: 0, price_yearly: 0, vehicle_limit: 100 } }
    expect(accountSignals(organization({ total_vehicles: 89, current_plan }))).toEqual([])
    expect(accountSignals(organization({ total_vehicles: 90, current_plan }))).toEqual(['90 of 100 asset slots used'])
    expect(accountSignals(organization({ total_vehicles: 1000, current_plan: { ...current_plan, plan: { ...current_plan.plan, vehicle_limit: null } } }))).toEqual([])
  })
})
