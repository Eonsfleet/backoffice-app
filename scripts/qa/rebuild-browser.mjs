// QA-only request interception. No fixture is imported by application code.
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(path.join(os.tmpdir(), 'eonsfleet-ui-qa/node_modules/playwright/index.mjs')).href)
const output = path.resolve('docs/qa')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ reducedMotion: 'reduce' })
await context.addCookies([{ name: 'eonsfleet-token', value: 'qa-only-intercepted', domain: 'localhost', path: '/' }])
await context.addInitScript(() => { if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'light') })
const pg = { current: 1, lastPage: 1, total: 1, perPage: 20 }
const org = { id: '42', attributes: { name: 'Eonsfleet Long Organization Name for Nationwide Logistics and Customer Support Operations', identifier: '1000042', status: 'active', email: 'operations.with.a.long.address@example.test', total_vehicles: 125000, total_devices: 98765, created_at: '2026-10-03T07:42:00Z' }, relationships: {} }
let failed = false, empty = false, unhealthy = false, missing = false
const templates = [{ code: 'VEHICLE_OFFLINE', name: 'Vehicle has stopped reporting telemetry', category: 'tracking', priority: 'warning', is_mandatory: true, templates: [{ id: 12, channel: 'email', subject: 'Vehicle {{vehicle_name}} has stopped reporting', body: '{{vehicle_name}} has not reported for {{offline_duration}}.', edited: true }] }]
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url()), p = url.pathname
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Request-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' }
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
  let data, status = 200
  if (p.endsWith('/auth/admin/me')) data = { data: { id: '1', name: 'QA Platform Administrator', email: 'qa@example.test', role: 'super_admin', avatar: null, last_login: null } }
  else if (p.endsWith('/notifications/unread-count')) data = { data: { count: 0 } }
  else if (p.endsWith('/admin/notifications')) data = { data: { notifications: [], pagination: pg } }
  else if (p.endsWith('/health') && !p.endsWith('/sensors/health')) { data = { status: unhealthy ? 'unhealthy' : 'degraded', timestamp: '2026-10-03T07:42:00Z', services: { database: { status: unhealthy ? 'down' : 'up', latency_ms: 2 }, redis: { status: 'up', latency_ms: 1 }, cache: { status: 'up' }, storage: { status: 'degraded', disk_usage_percent: 92 }, queue: { status: 'degraded', pending_jobs: 12000, failed_jobs: 0 }, geocoding: { status: 'up' } } }; status = unhealthy ? 503 : 200 }
  else if (p.endsWith('/admin/notification-templates')) data = { data: empty ? [] : templates }
  else if (/notification-templates\/12(?:\/reset)?$/.test(p)) data = { data: { id: 12, edited: true } }
  else if (p.endsWith('/admin/admins/installers')) data = { data: { installers: empty ? [] : [{ id: 7, attributes: missing ? {} : { name: 'Installer Name for a Regional Installation and Hardware Maintenance Team', email: 'installation.team.with.long.email@example.test', status: 'active' }, relationships: missing ? {} : { organizations: [{ id: '42', name: org.attributes.name, identifier: '1000042' }] } }], pagination: pg } }
  else if (p.endsWith('/admin/users/role/driver')) data = { data: { users: empty ? [] : [{ id: '81', attributes: { full_name: 'A Driver With A Long Full Name', email: 'driver@example.test', status: 'active', last_login: null }, relationships: { organization: org, current_vehicle: { id: '10', attributes: { registration_number: 'LAG-123-AB' } }, cluster: { id: 2, name: 'Western logistics' } } }], pagination: pg } }
  else if (p.endsWith('/admin/organizations')) data = { data: { organizations: empty ? [] : [org], pagination: pg } }
  else if (p.endsWith('/admin/vehicles/10')) data = { data: { id: '10', attributes: { registration_number: 'LAG-123-AB', make: 'Toyota', model: 'Hilux', status: 'active', device_status: 'online', device_id: '123456789012345' }, relationships: { organization: org } } }
  else if (p.endsWith('/admin/vehicles/10/sensors/health')) data = { data: { sensors: [{ name: 'Device connectivity', status: 'warning', description: 'Intermittent telemetry', suggested_action: 'Inspect device connectivity.' }] } }
  else if (url.origin === 'http://localhost:3100') return route.continue()
  else return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Unmapped QA API request' }) })
  if (failed && !p.endsWith('/auth/admin/me') && !p.includes('/notifications/')) { status = 500; data = { message: 'QA request failure' } }
  return route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(data) })
})
const page = await context.newPage()
page.setDefaultTimeout(30000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
const results = []
async function inspect(route, width, height, theme = 'light', state = 'normal') {
  console.log(`Inspecting ${route} at ${width}px (${theme}, ${state})`)
  await page.setViewportSize({ width, height })
  await page.goto(`http://localhost:3100${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForSelector('h1', { timeout: 30000 })
  await page.evaluate(theme => { localStorage.setItem('theme', theme); document.documentElement.classList.toggle('dark', theme === 'dark') }, theme)
  await page.waitForTimeout(1200)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  const contrast = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')
    const sample = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) }
    const lum = rgb => rgb.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((total, v, i) => total + v * [0.2126, 0.7152, 0.0722][i], 0)
    return [['foreground', 'background'], ['muted-foreground', 'card'], ['primary-foreground', 'primary'], ...['success', 'warning', 'error', 'info', 'neutral'].map(tone => [`status-${tone}`, `status-${tone}-surface`])].map(([fg, bg]) => {
      const a = lum(sample(root.getPropertyValue(`--${fg}`))), b = lum(sample(root.getPropertyValue(`--${bg}`)))
      return { pair: `${fg}/${bg}`, ratio: +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2) }
    })
  })
  const filename = `${route.split('/').filter(Boolean).join('-')}-${width}-${theme}-${state}.png`
  await page.screenshot({ path: path.join(output, filename), fullPage: true, timeout: 30000 })
  results.push({ route, width, theme, state, pageOverflow: overflow, contrast, screenshot: filename })
  if (overflow) throw new Error(`Page overflow: ${route} at ${width}`)
  if (contrast.some(pair => pair.ratio < 4.5)) throw new Error(`Text contrast below 4.5:1: ${JSON.stringify(contrast)}`)
}
try {
  await inspect('/platform-health', 1440, 1000)
  await inspect('/platform-health', 390, 844, 'dark')
  await inspect('/notification-templates', 1440, 1000)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Body (required)').fill('QA unsaved wording {{vehicle_name}}')
  failed = true
  await page.getByRole('button', { name: 'Save template', exact: true }).click()
  await page.getByText('Could not save the template.', { exact: false }).waitFor()
  if (await page.getByLabel('Body (required)').inputValue() !== 'QA unsaved wording {{vehicle_name}}') throw new Error('Failed save discarded the template edits')
  await page.screenshot({ path: path.join(output, 'template-failed-save.png'), fullPage: true, timeout: 30000 })
  failed = false
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('alertdialog').waitFor()
  await page.getByRole('button', { name: 'Discard changes' }).click()
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  failed = true
  await page.getByRole('button', { name: 'Mark for restoration', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('alert').waitFor()
  await page.screenshot({ path: path.join(output, 'template-reset-error.png'), timeout: 30000 })
  failed = false
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  await inspect('/notification-templates', 390, 844)
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await page.getByRole('dialog', { name: 'Main navigation' }).waitFor()
  await page.screenshot({ path: path.join(output, 'mobile-navigation.png'), timeout: 30000 })
  await page.getByRole('dialog', { name: 'Main navigation' }).getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Body (required)').waitFor()
  await page.screenshot({ path: path.join(output, 'mobile-template-editor.png'), timeout: 30000 })
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await inspect('/organizations', 768, 1024)
  const input = page.getByLabel('Search organizations', { exact: true })
  await input.fill('logistics')
  await page.waitForTimeout(400)
  if (!page.url().includes('q=logistics') || !(await input.evaluate(el => el === document.activeElement))) throw new Error('Search URL or focus was lost')
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
  if (new URL(page.url()).searchParams.has('q')) throw new Error('Reset did not clear the URL')
  await inspect('/drivers', 1280, 900)
  await inspect('/installers', 390, 844)
  await inspect('/vehicles/10', 1440, 1000)
  await page.getByRole('tab', { name: 'Sensor health' }).click()
  await page.getByText('Intermittent telemetry', { exact: true }).waitFor()
  await page.screenshot({ path: path.join(output, 'vehicle-sensors.png'), fullPage: true })
  missing = true
  await inspect('/installers', 768, 1024, 'light', 'unloaded-relationships')
  missing = false
  await page.evaluate(() => localStorage.setItem('eonsfleet-ui', JSON.stringify({ state: { sidebarCollapsed: true }, version: 0 })))
  await inspect('/platform-health', 1280, 900, 'dark', 'saved-collapsed-sidebar')
  if (await page.locator('aside').evaluate(el => el.getBoundingClientRect().width) !== 64) throw new Error('Saved collapsed sidebar preference was not restored')
  await page.evaluate(() => localStorage.setItem('eonsfleet-ui', JSON.stringify({ state: { sidebarCollapsed: false }, version: 0 })))
  unhealthy = true
  await inspect('/platform-health', 1024, 768, 'light', 'unhealthy')
  await page.getByText('unhealthy', { exact: true }).waitFor()
  unhealthy = false; empty = true
  await inspect('/notification-templates', 768, 1024, 'light', 'empty')
  empty = false; failed = true
  await inspect('/installers', 1280, 900, 'light', 'error')
  await page.locator('main').getByRole('alert').waitFor()
  if (errors.length) throw new Error(errors.join('\n'))
  await fs.writeFile(path.join(output, 'browser-results.json'), JSON.stringify({ fixtureOnly: true, results, pageErrors: errors }, null, 2))
  console.log(JSON.stringify({ checks: results.length, pageErrors: errors.length, screenshots: output }))
} catch (error) {
  await page.screenshot({ path: path.join(output, 'qa-failure.png'), timeout: 10000 }).catch(() => {})
  console.error(JSON.stringify({ url: page.url(), error: error.message, pageErrors: errors }))
  throw error
} finally { await browser.close() }
