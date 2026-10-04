import { format } from 'date-fns'
import type { OnboardingSource, Organization } from '@/types/api'

export const ONBOARDING_SOURCE_LABELS: Record<OnboardingSource, string> = {
  self_serve: 'Self-serve',
  admin: 'Admin',
}

/** Null when the API couldn't infer how an older organization joined. */
export function onboardingSourceLabel(source: Organization['onboarding_source']): string | null {
  return source ? ONBOARDING_SOURCE_LABELS[source] ?? source : null
}

/** e.g. "Trial ends Oct 18, 2026" — null when the organization isn't in a trial. */
export function trialSummary(plan: Organization['current_plan']): string | null {
  if (!plan?.in_trial) return null
  return plan.trial_ends_at ? `Trial ends ${format(new Date(plan.trial_ends_at), 'MMM d, yyyy')}` : 'In trial'
}

/** Server rule (OrganizationSlugService::PATTERN): a DNS label of 3–63 characters. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/
