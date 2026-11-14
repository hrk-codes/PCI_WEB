// Turnover page: the chart entrance, the year readout, the data table, accessibility and phone layout.
// Usage: node scripts/test-turnover.mjs   (dev server on PCI_BROWSER_URL, default http://127.0.0.1:3000)
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'
const require = createRequire(import.meta.url)
const url = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '') + '/turnover/'
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
await mkdir('test-results', {recursive:true})
const errors = []
async function open(viewport, options = {}) {
  const page = await browser.newPage({viewport, ...options})
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('/_next/hmr')) errors.push(m.text()) })
  await page.goto(url, {waitUntil:'networkidle'})
  return page
}
const panel = page => page.locator('section[aria-labelledby="turnover-title"]')
const readout = page => panel(page).locator('p').filter({hasText:'crore'}).innerText()

{
  const page = await open({width:1440, height:900})
  assert.equal(await panel(page).getByRole('button').count(), 11, 'eleven financial years')
  assert.equal(await panel(page).getAttribute('data-motion'), 'waiting', 'bars wait until they are on screen')
  await panel(page).locator('[data-plot]').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, 200))
  await page.waitForTimeout(900)
  await page.screenshot({path:'test-results/turnover-entrance.png'})
  await page.waitForTimeout(2200)
  assert.equal(await panel(page).getAttribute('data-motion'), 'done', 'the entrance finishes')
  assert.match(await readout(page), /265\.3/, 'latest year in crore')
  assert.match(await panel(page).innerText(), /−4\.3% on FY 2024–25/, 'latest change on the year before')
  assert.match(await panel(page).innerText(), /Highest turnover, FY 2024–25\s*₹277\.1 Cr/, 'highest year')
  await page.screenshot({path:'test-results/turnover.png'})
  await panel(page).getByRole('button', {name:/FY 2019–20/}).hover()
  assert.match(await readout(page), /131\.3/, 'pointing at a year shows its value')
  assert.match(await panel(page).innerText(), /\+6\.8% on FY 2018–19/, 'with its change on the year before')
  await panel(page).getByRole('button', {name:/FY 2020–21/}).hover()
  assert.match(await panel(page).innerText(), /−14\.8% on FY 2019–20/, 'a fall is shown as a fall')
  await page.screenshot({path:'test-results/turnover-hover.png'})
  await page.mouse.move(5, 5)
  assert.match(await readout(page), /265\.3/, 'leaving the chart returns to the latest year')
  await panel(page).getByText('View turnover data').click()
  assert.equal(await panel(page).locator('tbody tr').count(), 11)
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')})
  const violations = await page.evaluate(async () => (await window.axe.run('main', {runOnly:{type:'tag', values:['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})).violations.map(v => ({id:v.id, nodes:v.nodes.map(n => n.target)})))
  assert.deepEqual(violations, [], 'axe')
  await page.close()
}
{
  const page = await open({width:1280, height:800}, {reducedMotion:'reduce'})
  assert.equal(await panel(page).getAttribute('data-motion'), null, 'reduced motion: the finished chart, no entrance')
  assert.match(await readout(page), /265\.3/)
  await page.close()
}
{
  const page = await open({width:390, height:844}, {isMobile:true, hasTouch:true})
  await panel(page).locator('[data-plot]').scrollIntoViewIfNeeded()
  await page.waitForTimeout(3000)
  assert.equal(await panel(page).getAttribute('data-motion'), 'done', 'the entrance plays on a phone')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal overflow on a phone')
  await panel(page).getByRole('button', {name:/FY 2016–17/}).tap()
  assert.match(await readout(page), /25\.1/, 'tapping a year selects it')
  await panel(page).screenshot({path:'test-results/turnover-390.png'})
  await page.close()
}
await browser.close()
assert.deepEqual(errors, [], 'no page errors')
console.log('Turnover checks passed')
