// Fixture-only QA: external API calls are intercepted, never forwarded.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(path.join(os.tmpdir(), 'eonsfleet-ui-qa/node_modules/playwright/index.mjs')).href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ reducedMotion: 'reduce' })
await context.addCookies([{ name: 'eonsfleet-token', value: 'qa-only', domain: 'localhost', path: '/' }])
let role = 'finance', empty = false, fail = false
const requests = [], errors = [], checks = []
const pg = page => ({ current_page: Number(page || 1), last_page: 2, per_page: 15, total: empty ? 0 : 28 })
await context.route('**/*', async route => {
  const req = route.request(), url = new URL(req.url()), p = url.pathname
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
  let data, code = 200
  if (p.endsWith('/auth/admin/me')) data = { data: { id: '1', name: 'QA Finance Admin', email: 'qa@example.test', role } }
  else if (p.includes('/notifications')) data = { data: { count: 0, notifications: [] } }
  else if (p.endsWith('/analytics/summary')) data = { message: { total: 28, active: 21, inactive: 5, canceled: 2 } }
  else if (p.endsWith('/analytics/status-distribution')) data = { message: [{ status: 'active', count: 21 }, { status: 'expired', count: 5 }, { status: 'canceled', count: 2 }] }
  else if (p.endsWith('/admins/subscriptions')) data = { data: { subscriptions: empty ? [] : [{ id: 7, attributes: { status: 'active', subscription_type: 'production' }, relationships: { organization: { id: 42, name: 'Fleet & Co' }, plan: { id: 3, name: 'Production Plan' } } }], pagination: pg() } }
  else if (p.endsWith('/admins/subscriptions/transactions')) { requests.push({ path: p, params: Object.fromEntries(url.searchParams) }); data = { data: { transactions: empty ? [] : [{ id: 1, attributes: { reference: 'PAY-FLEET-42', amount: 12500, currency: 'NGN', payment_method: 'manual', status: 'failed', created_at: '2026-10-04T10:00:00Z' }, relationships: { organization: { id: 42, name: 'Fleet & Co' } } }], pagination: pg(url.searchParams.get('page')) } } }
  else if (p.endsWith('/admins/subscriptions/invoices')) { requests.push({ path: p, params: Object.fromEntries(url.searchParams) }); data = { data: { data: empty ? [] : [{ id: 2, invoice_number: 'INV-FLEET-42', amount: 12500, vat: 0, status: 'issued', created_at: '2026-10-04T10:00:00Z', pdf_available: true, organization: { id: 42, name: 'Fleet & Co' }, plan: 'Production Plan' }], meta: pg(url.searchParams.get('page')) } } }
  else if (p.endsWith('/reconciliation/mismatches')) { requests.push({ path: p, params: Object.fromEntries(url.searchParams) }); data = { data: { ...pg(url.searchParams.get('page')), per_page: 25, total: empty ? 0 : 30, data: empty ? [] : [{ id: 3, provider: 'paystack', kind: 'amount', expected_minor: 1250000, actual_minor: 1240000, status: 'open', created_at: '2026-10-04T10:00:00Z' }] } } }
  else if (url.origin === 'http://localhost:3100') return route.continue()
  else return route.fulfill({ status: 404, headers, body: '{}' })
  if (fail && p.includes('/admins/')) { code = 500; data = { message: 'QA finance feed unavailable' } }
  return route.fulfill({ status: code, headers, contentType: 'application/json', body: JSON.stringify(data) })
})
const page = await context.newPage()
page.on('pageerror', error => errors.push(error.message))
const output = path.resolve('docs/qa')
await fs.mkdir(output, { recursive: true })
async function capture(name) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${name} overflows`)
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true })
  checks.push(name)
}
try {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('http://localhost:3100/subscriptions')
  await page.getByRole('heading', { name: 'Subscription overview' }).waitFor()
  await page.getByText('Fleet & Co', { exact: true }).waitFor()
  const subscriptionsNav = page.getByRole('navigation', { name: 'Subscription sections' })
  assert.equal(await subscriptionsNav.getByRole('link', { name: 'Payments', exact: true }).count(), 0)
  await capture('subscriptions-overview-separated')
  await page.getByRole('link', { name: 'Open billing & payments', exact: true }).click()
  await page.getByRole('heading', { name: 'Billing & payments overview' }).waitFor()
  await page.getByText('PAY-FLEET-42', { exact: true }).waitFor()
  await capture('billing-overview-separated')
  await page.goto('http://localhost:3100/subscriptions/transactions?status=failed&payment_method=manual&q=Fleet&page=2')
  await page.waitForURL('**/billing/payments?**')
  await page.getByRole('heading', { name: 'Payments', exact: true }).waitFor()
  assert.equal(await page.getByLabel('Search payments', { exact: true }).inputValue(), 'Fleet')
  await page.getByText('PAY-FLEET-42', { exact: true }).waitFor()
  assert.ok(requests.some(r => r.path.endsWith('/transactions') && r.params.page === '2' && r.params.payment_method === 'manual' && r.params.q === 'Fleet'))
  await capture('billing-payments-filtered')
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
  assert.equal(new URL(page.url()).search, '')
  await page.goto('http://localhost:3100/subscriptions/invoices?status=issued&page=2&q=INV-FLEET-42')
  await page.waitForURL('**/billing/invoices?**')
  await page.getByRole('heading', { name: 'Invoices', exact: true }).waitFor()
  await page.getByRole('cell', { name: 'INV-FLEET-42', exact: true }).waitFor()
  assert.ok(requests.some(r => r.path.endsWith('/invoices') && r.params.page === '2' && r.params.q === 'INV-FLEET-42'))
  await capture('billing-invoices-filtered')
  await page.goto('http://localhost:3100/subscriptions/reconciliation?status=open&page=2')
  await page.waitForURL('**/billing/reconciliation?**')
  await page.getByRole('heading', { name: 'Reconciliation', exact: true }).waitFor()
  await page.getByRole('cell', { name: 'paystack', exact: true }).waitFor()
  assert.ok(requests.some(r => r.path.endsWith('/mismatches') && r.params.page === '2'))
  await capture('billing-reconciliation-page-two')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://localhost:3100/billing')
  await page.getByText('PAY-FLEET-42', { exact: true }).waitFor()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await capture('billing-overview-mobile-dark')
  role = 'support'
  const before = requests.filter(r => r.path.endsWith('/mismatches')).length
  await page.goto('http://localhost:3100/billing')
  await page.getByRole('heading', { name: 'Billing & payments overview' }).waitFor()
  await page.getByText('PAY-FLEET-42', { exact: true }).waitFor()
  assert.equal(await page.getByRole('navigation', { name: 'Billing & payments sections' }).getByRole('link', { name: 'Reconciliation', exact: true }).count(), 0)
  assert.equal(requests.filter(r => r.path.endsWith('/mismatches')).length, before)
  await page.goto('http://localhost:3100/billing/reconciliation')
  await page.getByRole('alert').filter({ hasText: 'You do not have permission' }).waitFor()
  assert.equal(requests.filter(r => r.path.endsWith('/mismatches')).length, before)
  await capture('billing-reconciliation-support-denied')
  role = 'finance'; empty = true
  await page.goto('http://localhost:3100/billing')
  await page.getByText('No payment records yet.', { exact: true }).waitFor()
  await capture('billing-overview-empty')
  fail = true
  await page.goto('http://localhost:3100/billing/payments')
  await page.getByRole('alert').filter({ hasText: 'Could not load these records.' }).waitFor({ timeout: 30000 })
  await capture('billing-payments-request-error')
  assert.equal(errors.length, 0, errors.join('\n'))
  await fs.writeFile(path.join(output, 'commercial-workspace-results.json'), JSON.stringify({ fixtureOnly: true, checks, pageErrors: errors, requests }, null, 2) + '\n')
  console.log(JSON.stringify({ checks: checks.length, pageErrors: errors.length }))
} finally { await browser.close() }
