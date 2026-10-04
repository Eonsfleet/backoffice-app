import { z } from 'zod'
import { SLUG_PATTERN } from '@/features/organizations/onboarding'

export const organizationDetailsSchema = z.object({
  name: z.string().min(3, 'Name must have at least 3 characters'),
  email: z.string().email('Invalid email'),
  phone_number: z.string().optional(),
  fleet_size: z.coerce.number().int().min(1, 'Fleet size is required'),
  industry: z.string().min(1, 'Industry is required'),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
})

// Slug is edit-only: the server generates it on create and ignores any sent.
export const organizationEditSchema = organizationDetailsSchema.extend({
  slug: z.string().trim().toLowerCase().optional().refine(
    (v) => !v || SLUG_PATTERN.test(v),
    'Use 3–63 lowercase letters, numbers or hyphens, not starting or ending with a hyphen',
  ),
})

export const organizationCreateSchema =organizationDetailsSchema.extend({
  plan_id: z.string().regex(/^[1-9]\d*$/, 'Plan is required'),
  billing_type: z.enum(['poc', 'production']),
  billing_cycle: z.enum(['monthly', 'yearly']).optional(),
  evaluation_days: z.coerce.number().optional(),
}).superRefine((values, ctx) => {
  if (values.billing_type === 'poc') {
    if (values.evaluation_days == null || !Number.isInteger(values.evaluation_days)
      || values.evaluation_days < 15 || values.evaluation_days > 30) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['evaluation_days'], message: 'POC period must be a whole number from 15 to 30 days' })
    }
  } else if (!values.billing_cycle) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['billing_cycle'], message: 'Choose monthly or yearly billing' })
  }
})

export type OrganizationFormValues = z.infer<typeof organizationCreateSchema>

export function organizationCreatePayload(values: OrganizationFormValues) {
  const { plan_id, billing_type, billing_cycle, evaluation_days, ...details } = values
  return {
    ...details,
    plan_id: Number(plan_id),
    billing_type,
    ...(billing_type === 'poc' ? { evaluation_days } : { billing_cycle }),
  }
}
