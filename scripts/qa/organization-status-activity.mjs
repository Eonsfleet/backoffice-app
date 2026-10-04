// Isolated browser fixtures; no API request reaches a live service.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(path.join(os.tmpdir(), 'eonsfleet-ui-qa/node_modules/playwright/index.mjs')).href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
await context.addCookies([{ name: 'eonsfleet-token', value: 'qa-only', domain: 'localhost', path: '/' }])
const errors = [], statusRequests = [], activityRequests = []
let status = null, failSave = true
const org = id => ({ id, attributes: { name: id === '42' ? 'QA Fleet' : 'Other Fleet', identifier: `10000${id}`, status, email: 'fleet@example.test', total_vehicles: 0, total_devices: 0, total_users: 0 }, relationships: { current_plan: { id: 7, status: 'active', plan: { id: 7, name: 'Fleet Plan' } } } })
await context.route('**/*', async route => {
  const req = route.request(), url = new URL(req.url()), p = url.pathname
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
  let data, code = 200
  if (p.endsWith('/auth/admin/me')) data = { data: { id: '1', name: 'Viewer Admin', email: 'viewer@example.test', role: 'super_admin' } }
  else if (/\/admin\/organizations\/42\/status$/.test(p)) {
    statusRequests.push(req.postDataJSON())
    if (failSave) { code = 500; data = { message: 'QA status save failed' } }
    else { status = req.postDataJSON().status; data = { data: org('42') } }
  }
  else if (/\/admin\/organizations\/\d+\/activity-log$/.test(p)) {
    activityRequests.push(p)
    if (p.includes('/43/')) { code = 500; data = { message: 'QA activity unavailable' } }
    else data = { data: [1, 2].map(id => ({ id, description: `Organization event ${id}`, resource_type: 'Organization', resource_id: '42', action: 'updated', changed_by: { id, name: `Acting Admin ${id}`, email: `actor${id}@example.test` }, changed_at: '2026-10-04T10:00:00Z', changes: null })), meta: { total: 2, current_page: 1, last_page: 1, per_page: 25 } }
  }
  else if (/\/admin\/organizations\/\d+$/.test(p)) data = { data: org(p.split('/').at(-1)) }
  else if (p.endsWith('/admin/organizations')) data = { data: { organizations: [org('42')], pagination: { current: 1, lastPage: 1, total: 1, perPage: 20 } } }
  else if (p.includes('/notifications')) data = { data: { count: 0, notifications: [], pagination: { current: 1, lastPage: 1, total: 0, perPage: 20 } } }
  else if (url.origin === 'http://localhost:3100') return route.continue()
  else return route.fulfill({ status: 404, headers, contentType: 'application/json', body: '{}' })
  return route.fulfill({ status: code, headers, contentType: 'application/json', body: JSON.stringify(data) })
})
const page = await context.newPage()
page.on('pageerror', error => errors.push(error.message))
const output = path.resolve('docs/qa')
await fs.mkdir(output, { recursive: true })
try {
  await page.goto('http://localhost:3100/organizations')
  await page.getByRole('cell', { name: /^not set$/i }).waitFor()
  await page.goto('http://localhost:3100/organizations/42')
  await page.getByRole('button', { name: 'Change status', exact: true }).click()
  await page.getByText('Current status', { exact: true }).waitFor()
  assert.equal(await page.getByLabel('New status').inputValue(), 'active')
  await page.getByRole('button', { name: 'Save status', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'QA status save failed' }).waitFor()
  assert.equal(await page.getByLabel('New status').inputValue(), 'active')
  await page.screenshot({ path: path.join(output, 'organization-status-failed-save.png') })
  failSave = false
  await page.getByRole('button', { name: 'Save status', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.deepEqual(statusRequests, [{ status: 'active' }, { status: 'active' }])
  await page.getByRole('tab', { name: 'Audit activity' }).click()
  await page.getByText('Acting Admin 1', { exact: true }).waitFor()
  await page.getByText('Acting Admin 2', { exact: true }).waitFor()
  assert.ok(activityRequests.every(p => p.endsWith('/42/activity-log')))
  if (await page.locator('[data-sonner-toast]').count()) await page.locator('[data-sonner-toast]').last().waitFor({ state: 'hidden' })
  await page.screenshot({ path: path.join(output, 'organization-scoped-activity.png') })
  await page.goto('http://localhost:3100/organizations/43')
  await page.getByRole('tab', { name: 'Audit activity' }).click()
  await page.getByRole('alert').filter({ hasText: 'Could not load organization activity.' }).waitFor({ timeout: 30000 })
  assert.equal(await page.getByText('No activity recorded for this organization.').count(), 0)
  await page.getByRole('button', { name: 'Retry', exact: true }).waitFor()
  await page.screenshot({ path: path.join(output, 'organization-activity-request-error.png') })
  assert.equal(errors.length, 0, errors.join('\n'))
  await fs.writeFile(path.join(output, 'organization-status-activity-results.json'), JSON.stringify({ fixtureOnly: true, pageErrors: errors, statusRequests, activityRequests }, null, 2) + '\n')
  console.log(JSON.stringify({ pageErrors: errors.length, statusRequests: statusRequests.length, activityRequests }))
} finally { await browser.close() }
