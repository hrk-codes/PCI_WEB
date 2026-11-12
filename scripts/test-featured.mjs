// Homepage "Featured products": overhead conductors hanging from a drawn transmission span.
// Needs the site running (pnpm dev) at PCI_BROWSER_URL, default http://127.0.0.1:3000/.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'
const require = createRequire(import.meta.url)
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const url = process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000/'
await mkdir('test-results', {recursive:true})
const errors = []
const products = ['aac', 'aaac', 'acsr', 'aacsr', 'acar', 'eco-panther']
async function open(options = {}) {
  const page = await browser.newPage({viewport:{width:1440, height:950}, ...options})
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url, {waitUntil:'networkidle'})
  return page
}
const line = page => page.locator('.conductor-line')
const show = page => line(page).evaluate(el => el.closest('section').scrollIntoView({block:'start', behavior:'instant'}))
const axe = async page => {
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')})
  const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('.conductor-line').closest('section'), {runOnly:{type:'tag', values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations)
  return violations.map(v => ({id:v.id, nodes:v.nodes.map(n => n.target)}))
}
try {
  const page = await open()
  const section = line(page).locator('xpath=ancestor::section')
  assert.equal(await section.getByRole('heading', {name:'Featured products.'}).count(), 1)
  assert.equal(await section.locator('.product-grid').count(), 0, 'The photo cards are gone')
  assert.deepEqual(await line(page).locator('a').evaluateAll(links => links.map(a => new URL(a.href).pathname)), products.map(slug => `/products/${slug}/`), 'Six conductors link to their pages')
  assert.equal(await line(page).getAttribute('data-entrance'), 'waiting', 'Entrance waits below the fold')
  await show(page)
  await page.waitForFunction(() => document.querySelector('.conductor-line').dataset.entrance === 'running')
  await page.waitForTimeout(2400)
  const layout = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.conductor-list li')].map(li => li.getBoundingClientRect())
    const span = document.querySelector('.conductor-span').getBoundingClientRect()
    const opaque = [...document.querySelectorAll('.conductor-list li')].every(li => getComputedStyle(li).opacity === '1')
    const overlap = items.some((a, i) => items.some((b, j) => i < j && !(a.right <= b.left || b.right <= a.left)))
    return {opaque, overlap, inside:items.every(r => r.bottom <= span.bottom + 2 && r.left >= span.left - 2 && r.right <= span.right + 2), sagging:items[2].top > items[0].top && items[2].top > items[5].top}
  })
  assert.deepEqual(layout, {opaque:true, overlap:false, inside:true, sagging:true}, 'Conductors hang along the span without overlapping')
  await line(page).screenshot({path:'test-results/featured-desktop.png'})
  assert.deepEqual(await axe(page), [], 'Accessibility')
  const short = await open({viewport:{width:1055, height:772}})
  await show(short)
  await short.waitForTimeout(2400)
  await line(short).screenshot({path:'test-results/featured-1055.png'})
  const mobile = await open({viewport:{width:390, height:844}, isMobile:true, hasTouch:true})
  await show(mobile)
  const row = await mobile.locator('.conductor-list').evaluate(el => ({scrolls:el.scrollWidth > el.clientWidth, snap:getComputedStyle(el).scrollSnapType}))
  assert.ok(row.scrolls && row.snap.includes('x'), 'Phone conductors swipe sideways')
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No page overflow on phones')
  await line(mobile).screenshot({path:'test-results/featured-mobile.png'})
  const reduced = await open({reducedMotion:'reduce'})
  assert.equal(await line(reduced).getAttribute('data-entrance'), null, 'Reduced motion shows the span immediately')
  const noJS = await open({javaScriptEnabled:false})
  assert.equal(await noJS.locator('.conductor-list li').first().evaluate(li => getComputedStyle(li).opacity), '1', 'No-JavaScript conductors visible')
  assert.deepEqual(errors, [])
  console.log('Featured products: six conductor links, one-time line entrance, sag layout, phone swipe row, reduced motion, no-JS and accessibility passed.')
} finally { await browser.close() }
