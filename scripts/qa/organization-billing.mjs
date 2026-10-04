// Local fixture QA only: every API request is intercepted.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(path.join(os.tmpdir(), 'eonsfleet-ui-qa/node_modules/playwright/index.mjs')).href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
await context.addCookies([{ name: 'eonsfleet-token', value: 'qa-only', domain: 'localhost', path: '/' }])
const requests = [], errors = []
await context.route('**/*', async route => {
  const req = route.request(), url = new URL(req.url()), p = url.pathname
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
  let data
  if (p.endsWith('/auth/admin/me')) data = { data: { id: '1', name: 'QA Admin', email: 'qa@example.test', role: 'super_admin' } }
  else if (p.endsWith('/admins/subscriptions/plans')) data = { data: [{ id: 7, attributes: { name: 'Fleet Standard' } }] }
  else if (p.endsWith('/admin/organizations') && req.method() === 'POST') { requests.push(req.postDataJSON()); data = { data: { id: '42', attributes: req.postDataJSON() } } }
  else if (p.endsWith('/admin/organizations')) data = { data: { organizations: [], pagination: { current: 1, lastPage: 1, total: 0, perPage: 20 } } }
  else if (p.includes('/notifications')) data = { data: { count: 0, notifications: [], pagination: { current: 1, lastPage: 1, total: 0, perPage: 20 } } }
  else if (url.origin === 'http://localhost:3100') return route.continue()
  else return route.fulfill({ status: 404, headers, body: '{}' })
  return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(data) })
})
const page = await context.newPage()
page.on('pageerror', error => errors.push(error.message))
const output = path.resolve('docs/qa')
await fs.mkdir(output, { recursive: true })
try {
  await page.goto('http://localhost:3100/organizations')
  for (const [type, period] of [['poc', '15'], ['production', 'monthly'], ['production', 'yearly']]) {
    await page.getByRole('button', { name: 'New Organization', exact: true }).click()
    await page.getByPlaceholder('Sahara Transport').fill('QA Fleet')
    await page.getByPlaceholder('admin@sahara.com').fill(`qa-${type}-${period}@example.test`)
    await page.getByPlaceholder('50', { exact: true }).fill('5')
    await page.getByPlaceholder('Logistics', { exact: true }).fill('Logistics')
    await page.getByRole('combobox', { name: 'Plan', exact: true }).click()
    await page.getByRole('option', { name: 'Fleet Standard' }).click()
    if (type === 'production') {
      await page.getByRole('combobox', { name: 'Plan type', exact: true }).click()
      await page.getByRole('option', { name: 'Production', exact: true }).click()
      assert.equal(await page.getByRole('spinbutton', { name: 'POC period in days' }).count(), 0)
      await page.getByText('The production plan is assigned now. Purchase asset capacity from the subscriber account before onboarding vehicles.').waitFor()
      await page.getByRole('combobox', { name: 'Billing cycle' }).click()
      await page.getByRole('option', { name: period === 'yearly' ? 'Yearly' : 'Monthly', exact: true }).click()
    } else {
      assert.equal(await page.getByRole('combobox', { name: 'Billing cycle' }).count(), 0)
      await page.getByRole('spinbutton', { name: 'POC period in days' }).fill(period)
    }
    if (await page.locator('[data-sonner-toast]').count()) await page.locator('[data-sonner-toast]').last().waitFor({ state: 'hidden' })
    await page.screenshot({ path: path.join(output, `organization-create-${type}-${period}-blue.png`) })
    const response = page.waitForResponse(res => res.request().method() === 'POST' && res.url().endsWith('/admin/organizations'))
    await page.getByRole('button', { name: 'Create Organization', exact: true }).click()
    await response
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    const payload = requests.at(-1)
    assert.equal(payload.billing_type, type)
    assert.equal(payload.plan_id, 7)
    if (type === 'poc') { assert.equal(payload.evaluation_days, 15); assert.ok(!('billing_cycle' in payload)) }
    else { assert.equal(payload.billing_cycle, period); assert.ok(!('evaluation_days' in payload)) }
  }
  const palettes = []
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme)
    palettes.push(await page.evaluate(theme => ({ theme, primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(), foreground: getComputedStyle(document.documentElement).getPropertyValue('--primary-foreground').trim() }), theme))
  }
  assert.deepEqual(palettes.map(p => p.primary), ['#1d4ed8', '#60a5fa'])
  assert.equal(errors.length, 0, errors.join('\n'))
  await fs.writeFile(path.join(output, 'organization-billing-results.json'), JSON.stringify({ fixtureOnly: true, scenarios: requests.length, pageErrors: errors, palettes }, null, 2) + '\n')
  console.log(JSON.stringify({ scenarios: requests.length, pageErrors: errors.length, palettes }))
} finally { await browser.close() }
