import { describe, expect, it } from 'vitest'
import { organizationCreateSchema, organizationCreatePayload, organizationDetailsSchema } from '@/features/organizations/form-schema'

const details = { name: 'Fleet Operations', email: 'fleet@example.test', fleet_size: 5, industry: 'Logistics' }
const poc = { ...details, plan_id: '7', billing_type: 'poc', evaluation_days: 30 } as const

describe('organization creation billing choices', () => {
  it.each([15, 21, 30])('accepts a %s day POC without a billing cycle', evaluation_days => {
    expect(organizationCreateSchema.safeParse({ ...poc, evaluation_days }).success).toBe(true)
  })
  it.each([0, 14, 31, 20.5, undefined])('rejects invalid POC duration %s', evaluation_days => {
    const result = organizationCreateSchema.safeParse({ ...poc, evaluation_days })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(issue => issue.path[0] === 'evaluation_days')).toBe(true)
  })
  it.each(['monthly', 'yearly'])('accepts production %s without an evaluation period', billing_cycle => {
    expect(organizationCreateSchema.safeParse({ ...details, plan_id: '7', billing_type: 'production', billing_cycle }).success).toBe(true)
  })
  it('requires a production billing cycle and a real plan selection', () => {
    expect(organizationCreateSchema.safeParse({ ...details, plan_id: '7', billing_type: 'production' }).success).toBe(false)
    expect(organizationCreateSchema.safeParse({ ...poc, plan_id: '' }).success).toBe(false)
  })
  it('omits hidden billing fields when switching between plan types', () => {
    const values = organizationCreateSchema.parse({ ...poc, billing_cycle: 'monthly' })
    expect(organizationCreatePayload(values)).toEqual({ ...details, plan_id: 7, billing_type: 'poc', evaluation_days: 30 })
    expect(organizationCreatePayload({ ...values, billing_type: 'production', billing_cycle: 'yearly' })).toEqual({ ...details, plan_id: 7, billing_type: 'production', billing_cycle: 'yearly' })
  })
  it('allows editing an organization that has no subscription', () => {
    expect(organizationDetailsSchema.parse({ ...details, plan_id: '', billing_type: 'poc' })).toEqual(details)
  })
})
