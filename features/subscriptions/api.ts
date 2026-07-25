import { api } from '@/lib/api/client'
import { normalizePaginated } from '@/lib/api/utils'
import type {
  Addon,
  AssetSubscription,
  BillingCycle,
  Feature,
  Invoice,
  PaginatedResponse,
  SubStatus,
  Subscription,
  SubscriptionPlan,
  SubscriptionSummary,
  Transaction,
} from '@/types/api'

// ─── Normalizers ─────────────────────────────────────────────────────────────

type RawNestedItem = {
  id: string | number
  attributes?: Record<string, unknown>
  relationships?: unknown
}

type RawPlan = {
  id: string | number
  attributes: Record<string, unknown>
  relationships?: {
    features?: RawNestedItem[]
    addons?: RawNestedItem[]
  }
}

function flattenNestedItem<T>(raw: RawNestedItem): T {
  return { id: raw.id, ...(raw.attributes ?? {}) } as T
}

function normalizePlan(raw: RawPlan): SubscriptionPlan {
  return {
    id: raw.id,
    ...(raw.attributes as Omit<SubscriptionPlan, 'id' | 'features' | 'addons'>),
    features: (raw.relationships?.features ?? []).map((f) => flattenNestedItem<Feature>(f)),
    addons:   (raw.relationships?.addons   ?? []).map((a) => flattenNestedItem<Addon>(a)),
  }
}

type RawSubscription = {
  id: string | number
  attributes: {
    started_at?:      string | null
    ended_at?:        string | null
    organization_id?: string | number | null
    status?:          string | null
    billing_cycle?:   string | null
    next_billing_date?: string | null
    trial_ends_at?: string | null
    price?:           number | null
    vehicle_count?:   number | null
    mrr?:             number | null
    [key: string]:    unknown
  }
  relationships?: {
    organization?: { id: string | number; name?: string; attributes?: { name: string; identifier?: string | number } } | null
    plan?: { id: string | number; name: string } | null
  }
}

function resolveStatus(raw: string | null | undefined): Subscription['status'] {
  if (!raw || raw === '0') return 'expired'
  if (raw === '1' || raw === 'active') return 'active'
  if (raw === '2') return 'trial'
  return raw as Subscription['status']
}

function normalizeSubscription(raw: RawSubscription): Subscription {
  const relOrg = raw.relationships?.organization
  const orgId  = relOrg?.id ?? raw.attributes.organization_id ?? ''
  const orgName = relOrg
    ? ((relOrg as { name?: string }).name ?? relOrg.attributes?.name ?? '')
    : ''

  return {
    id:               raw.id,
    status:           resolveStatus(raw.attributes.status),
    started_at:       raw.attributes.started_at ?? '',
    ends_at:          raw.attributes.ended_at   ?? null,
    billing_cycle:    raw.attributes.billing_cycle as Subscription['billing_cycle'] ?? undefined,
    next_billing_date: raw.attributes.next_billing_date ?? null,
    trial_ends_at:    raw.attributes.trial_ends_at ?? null,
    price:            raw.attributes.price ?? undefined,
    vehicle_count:    raw.attributes.vehicle_count ?? undefined,
    mrr:              raw.attributes.mrr ?? undefined,
    organization:     { id: orgId, name: orgName },
    plan:             raw.relationships?.plan ?? { id: '', name: '' },
  }
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export const listPlans = async (): Promise<SubscriptionPlan[]> => {
  const { data } = await api.get('/admins/subscriptions/plans')
  const raw: RawPlan[] = data.data ?? []
  return raw.map(normalizePlan)
}

export const getPlan = async (id: string | number): Promise<SubscriptionPlan> => {
  const { data } = await api.get(`/admins/subscriptions/plans/${id}`)
  return normalizePlan(data.data)
}

export interface CreatePlanPayload {
  name:               string
  description:        string
  price_monthly:      number
  price_yearly:       number
  has_custom_pricing: boolean
  features?:          Array<{ id: string | number; unit?: number }>
  addons?:            Array<string | number>
}

export const createPlan = async (payload: CreatePlanPayload): Promise<SubscriptionPlan> => {
  const { data } = await api.post('/admins/subscriptions/plans', payload)
  return normalizePlan(data.data)
}

export const updatePlan = async (
  id: string | number,
  payload: Partial<CreatePlanPayload>
): Promise<SubscriptionPlan> => {
  const { data } = await api.put(`/admins/subscriptions/plans/${id}`, payload)
  return normalizePlan(data.data)
}

export const togglePlanStatus = async (id: string | number): Promise<void> => {
  await api.post(`/admins/subscriptions/plans/${id}/toggle`)
}

export const deletePlan = async (id: string | number): Promise<void> => {
  await api.delete(`/admins/subscriptions/plans/${id}`)
}

// ─── Add-ons ──────────────────────────────────────────────────────────────────

export const listAddons = async (): Promise<Addon[]> => {
  const { data } = await api.get('/admins/subscriptions/addons')
  const raw: RawNestedItem[] = data.data ?? []
  return raw.map((a) => flattenNestedItem<Addon>(a))
}

export interface CreateAddonPayload {
  name:   string
  price:  number
  module: string
}

export const createAddon = async (payload: CreateAddonPayload): Promise<Addon> => {
  const { data } = await api.post('/admins/subscriptions/addons', payload)
  return data.data
}

export const updateAddon = async (id: string | number, payload: Partial<CreateAddonPayload>): Promise<Addon> => {
  const { data } = await api.put(`/admins/subscriptions/addons/${id}`, payload)
  return data.data
}

export const deleteAddon = async (id: string | number): Promise<void> => {
  await api.delete(`/admins/subscriptions/addons/${id}`)
}

// ─── Features ─────────────────────────────────────────────────────────────────

export const listFeatures = async (): Promise<Feature[]> => {
  const { data } = await api.get('/admins/subscriptions/features')
  const raw: RawNestedItem[] = data.data ?? []
  return raw.map((f) => flattenNestedItem<Feature>(f))
}

export const createFeature = async (payload: { name: string; description: string }): Promise<Feature> => {
  const { data } = await api.post('/admins/subscriptions/features', payload)
  return data.data
}

// ─── Subscribers ──────────────────────────────────────────────────────────────

export const listSubscribers = async (params?: {
  page?:     number
  per_page?: number
  q?:        string
  status?:   string
  billing_cycle?: string
}): Promise<PaginatedResponse<Subscription>> => {
  const { data } = await api.get('/admins/subscriptions', { params })
  const inner = data.data
  const raw: RawSubscription[] = inner?.subscriptions ?? inner?.data ?? []
  const pg = inner?.pagination
  return {
    data: raw.map(normalizeSubscription),
    meta: {
      current_page: pg?.current_page ?? pg?.current ?? 1,
      last_page:    pg?.last_page    ?? pg?.lastPage ?? 1,
      per_page:     pg?.per_page     ?? pg?.perPage  ?? raw.length,
      total:        pg?.total        ?? raw.length,
    },
  }
}

export const getSubscription = async (id: string | number): Promise<Subscription> => {
  const { data } = await api.get(`/admins/subscriptions/${id}/show`)
  return normalizeSubscription(data.data)
}

export const getSubscriptionTransactions = async (id: string | number) => {
  const { data } = await api.get(`/admins/subscriptions/${id}/transactions`)
  return data.data?.transactions ?? data.data ?? []
}

export interface UpdateSubscriptionPayload {
  plan_id?: string | number
  billing_cycle?: BillingCycle
  ended_at?: string | null
  trial_ends_at?: string | null
  status?: SubStatus | 'canceled'
  note?: string
}

export const updateSubscription = async (
  id: string | number,
  payload: UpdateSubscriptionPayload
): Promise<Subscription> => {
  const { data } = await api.patch(`/admins/subscriptions/${id}`, payload)
  return normalizeSubscription(data.data)
}

// ─── Billing ──────────────────────────────────────────────────────────────────

type RawTransaction = {
  id: string | number
  attributes: {
    reference:      string
    amount:         number
    currency?:      string
    payment_method: string
    status:         string
    paid_at?:       string | null
    created_at:     string
  }
  relationships?: {
    organization?: { id: string | number; name: string; email?: string } | null
    subscription?: {
      id: string | number
      billing_cycle?: string
      status?: string
      plan?: { id: string | number; name: string }
    } | null
  }
}

function normalizeTransaction(r: RawTransaction): Transaction {
  return {
    id:             r.id,
    reference:      r.attributes.reference,
    amount:         r.attributes.amount,
    currency:       r.attributes.currency,
    payment_method: r.attributes.payment_method,
    status:         r.attributes.status as Transaction['status'],
    paid_at:        r.attributes.paid_at,
    created_at:     r.attributes.created_at,
    organization:   r.relationships?.organization ?? null,
    subscription:   r.relationships?.subscription ?? null,
  }
}

export const listTransactions = async (params?: {
  page?:     number
  per_page?: number
  status?:   string
  gateway?:  string
}): Promise<PaginatedResponse<Transaction>> => {
  const { data } = await api.get('/admins/subscriptions/transactions', { params })
  const inner = data.data
  const raw: RawTransaction[] = inner?.transactions ?? inner?.data ?? []
  const pg = inner?.pagination
  return {
    data: raw.map(normalizeTransaction),
    meta: {
      current_page: pg?.current_page ?? pg?.current ?? 1,
      last_page:    pg?.last_page    ?? pg?.lastPage ?? 1,
      per_page:     pg?.per_page     ?? pg?.perPage  ?? raw.length,
      total:        pg?.total        ?? raw.length,
    },
  }
}

export const listInvoices = async (params?: {
  page?:     number
  per_page?: number
  status?:   string
}): Promise<PaginatedResponse<Invoice>> => {
  const { data } = await api.get('/admins/subscriptions/invoices', { params })
  return normalizePaginated<Invoice>(data)
}

export const downloadInvoice = async (id: string | number): Promise<void> => {
  const response = await api.get(`/admins/subscriptions/invoices/${id}/download`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `invoice-${id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export const retryPayment = async (organizationId: string | number): Promise<void> => {
  await api.post(`/admins/subscriptions/retry/${organizationId}`)
}

export const exportTransactions = async (): Promise<void> => {
  const response = await api.get('/admins/subscriptions/transactions/export', {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getSubscriptionSummary = async (): Promise<SubscriptionSummary> => {
  const { data } = await api.get('/admins/subscriptions/analytics/summary')
  // Stats live in `message`, not `data`
  const msg = data.message
  if (!msg || typeof msg !== 'object') {
    throw new Error('Unexpected response shape from subscription summary endpoint.')
  }
  return msg as SubscriptionSummary
}

export interface StatusDistributionItem {
  status: string
  count:  number
}

const STATUS_LABEL_MAP: Record<string, string> = {
  '1': 'active',
  '2': 'trial',
  '3': 'grace',
  '4': 'restricted',
  '5': 'suspended',
  '0': 'expired',
}

export const getSubscriptionStatusDistribution = async (): Promise<StatusDistributionItem[]> => {
  const { data } = await api.get('/admins/subscriptions/analytics/status-distribution')
  const raw: StatusDistributionItem[] = Array.isArray(data.message) ? data.message : []
  return raw.map((item) => ({
    status: STATUS_LABEL_MAP[item.status] ?? item.status,
    count:  item.count,
  }))
}

export interface MrrByPlan {
  plan:        string
  subscribers: number
  mrr:         number
}

export interface MrrAnalytics {
  current_mrr:            number
  mrr_by_plan:            MrrByPlan[]
  new_mrr_this_month:     number
  churned_mrr_this_month: number
  net_mrr_movement:       number
  churn_rate:             number
  active_subscriptions:   number
  cancelled_this_month:   number
}

export const getMrrAnalytics = async (): Promise<MrrAnalytics> => {
  const { data } = await api.get('/admins/subscriptions/analytics/mrr')
  const msg = data.message
  if (!msg || typeof msg !== 'object') {
    throw new Error('Unexpected response shape from MRR analytics endpoint.')
  }
  return msg as MrrAnalytics
}

// ─── Per-asset Subscriptions ──────────────────────────────────────────────────

export const listAssetSubscriptions = async (params?: {
  org_id?:   string | number
  status?:   string
  type?:     'Vehicle' | 'Device'
  page?:     number
  per_page?: number
}): Promise<PaginatedResponse<AssetSubscription>> => {
  const { data } = await api.get('/admins/subscriptions/assets', { params })
  return normalizePaginated<AssetSubscription>(data)
}

export const getAssetSubscription = async (id: string | number): Promise<AssetSubscription> => {
  const { data } = await api.get(`/admins/subscriptions/assets/${id}`)
  return data.data as AssetSubscription
}
