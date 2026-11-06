import assert from 'node:assert/strict'
import { access, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'
import clients from '../content/clients.json' with { type: 'json' }

const require = createRequire(import.meta.url)
const url = process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000'
const paths = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean)
let executablePath
for (const path of paths) { try { await access(path); executablePath = path; break } catch {} }
await mkdir('test-results', { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const roster = Object.values(clients).flat().map(client => client.name)
const seen = new Set()
const tiles = page => page.locator('ul[aria-label="Featured PCI clients"] > li[data-client]')
const names = async page => tiles(page).evaluateAll(nodes => nodes.map(node => node.getAttribute('data-client')))
const snapshot = async page => {
  const current = await names(page)
  assert.equal(current.length, 8)
  assert.equal(new Set(current).size, 8, 'No duplicated visible clients')
  current.forEach(name => seen.add(name))
  return current
}
const advance = async (page, ms) => { await page.clock.runFor(ms); await page.waitForTimeout(25) }

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 950 }, reducedMotion: 'no-preference' })
  const errors = []
  desktop.on('pageerror', error => errors.push(error.message))
  await desktop.goto(url)
  const section = desktop.locator('section').filter({ has: desktop.getByRole('heading', { name: 'Our clients and partners.' }) })
  const grid = section.locator('ul[aria-label="Featured PCI clients"]')
  await grid.scrollIntoViewIfNeeded()
  await desktop.waitForFunction(() => document.querySelector('ul[aria-label="Featured PCI clients"] > li[data-client]'))
  await desktop.clock.install()
  assert.deepEqual(await snapshot(desktop), [clients.Utilities[0].name, clients['Rail & public sector'][0].name, clients.International[0].name, clients.Renewables[0].name, clients.Utilities[1].name, clients['Rail & public sector'][1].name, clients.International[1].name, clients.Renewables[1].name])
  assert.equal(await grid.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 4, 'Desktop has four columns')
  assert.equal(await section.locator('.client-tabs').count(), 0, 'Homepage category tabs removed')
  assert.equal(await section.getByRole('link', { name: 'Explore our clients' }).getAttribute('href'), '/clients/')
  await section.screenshot({ path: 'test-results/client-showcase-desktop.png' })
  for (let i = 0; i < 220 && seen.size < roster.length; i++) { await advance(desktop, 420); await snapshot(desktop) }
  assert.deepEqual([...seen].sort(), roster.slice().sort(), 'The rotation shows all 34 clients')

  const pause = section.getByRole('button', { name: 'Pause logos' })
  await pause.click()
  const frozen = await names(desktop)
  await advance(desktop, 6500)
  assert.deepEqual(await names(desktop), frozen, 'Local pause freezes the display')
  await section.getByRole('button', { name: 'Play logos' }).click()
  await advance(desktop, 3400)
  assert.notDeepEqual(await names(desktop), frozen, 'Play resumes the display')

  await grid.hover()
  const hovered = await names(desktop)
  await advance(desktop, 6500)
  assert.deepEqual(await names(desktop), hovered, 'Hover freezes the display')
  await desktop.mouse.move(0, 0)
  await tiles(desktop).first().focus()
  const focused = await names(desktop)
  await advance(desktop, 6500)
  assert.deepEqual(await names(desktop), focused, 'Keyboard focus freezes the display')
  await section.getByRole('link', { name: 'Explore our clients' }).focus()
  await desktop.evaluate(() => { document.documentElement.dataset.pciMotion = 'paused' })
  const siteFrozen = await names(desktop)
  await advance(desktop, 6500)
  assert.deepEqual(await names(desktop), siteFrozen, 'Site pause preference freezes the display')
  await desktop.evaluate(() => { document.documentElement.dataset.pciMotion = '' })
  await desktop.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await advance(desktop, 100)
  const offscreen = await names(desktop)
  await advance(desktop, 6500)
  assert.deepEqual(await names(desktop), offscreen, 'Off-screen display does not rotate')
  await desktop.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
  const axe = await desktop.evaluate(() => window.axe.run(document.querySelector('ul[aria-label="Featured PCI clients"]').parentElement, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))
  assert.deepEqual(axe.violations.map(result => result.id), [], 'Showcase accessibility check')
  assert.deepEqual(errors, [], 'No client exceptions')

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce' })
  await mobile.goto(url)
  const mobileGrid = mobile.locator('ul[aria-label="Featured PCI clients"]')
  await mobileGrid.scrollIntoViewIfNeeded()
  assert.equal(await mobileGrid.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 2, 'Mobile has two columns')
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, 'No mobile horizontal overflow')
  const firstTile = tiles(mobile).first()
  const image = await firstTile.locator('img').boundingBox()
  const name = await firstTile.getByText(clients.Utilities[0].name).boundingBox()
  const card = await firstTile.boundingBox()
  assert.ok(image && name && card && image.y + image.height <= name.y && name.y + name.height <= card.y + card.height, 'Long mobile client names clear their logos and fit the card')
  assert.equal(await mobile.getByRole('button', { name: /Pause logos|Play logos/ }).count(), 0, 'Reduced motion suppresses autoplay controls')
  const staticNames = await names(mobile)
  await mobile.waitForTimeout(3100)
  assert.deepEqual(await names(mobile), staticNames, 'Reduced motion keeps logos still')
  await mobileGrid.screenshot({ path: 'test-results/client-showcase-mobile.png' })

  const noJs = await browser.newPage({ javaScriptEnabled: false })
  await noJs.goto(url)
  assert.equal(await tiles(noJs).count(), 8, 'Eight logos render without JavaScript')
  assert.equal(await noJs.getByRole('link', { name: 'Explore our clients' }).count(), 1)
  await noJs.close()
  await mobile.close()
  const zoom = await browser.newPage({ viewport: { width: 720, height: 475 }, reducedMotion: 'reduce' })
  await zoom.goto(url)
  await zoom.locator('ul[aria-label="Featured PCI clients"]').scrollIntoViewIfNeeded()
  assert.equal(await zoom.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, 'Narrow effective viewport at 200% zoom has no horizontal overflow')
  await zoom.close()
  await desktop.goto(url + '/clients/')
  assert.equal(await desktop.getByRole('button', { name: 'Utilities' }).count(), 1, 'Client directory keeps category tabs')
  console.log('Client showcase: all 34 clients, desktop/mobile, motion controls, no-JS, accessibility, and directory passed.')
} finally { await browser.close() }
