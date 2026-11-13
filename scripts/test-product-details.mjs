// Product construction views and catalogue directory. Run with the local preview running.
import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'

const require = createRequire(import.meta.url)
const catalogue = JSON.parse(await readFile(new URL('../content/catalogue.json', import.meta.url), 'utf8'))
const specifications = JSON.parse(await readFile(new URL('../content/product-specifications.json', import.meta.url), 'utf8'))
const expectedCounts = { aac: 108, aaac: 75, acsr: 161, aacsr: 33, 'al-59': 10, 'eco-panther': 3, 'gi-earth-wire': 65, 'pvc-power-cable': 166, 'aerial-bunched-cable': 6, 'lt-xlpe-cable': 131, 'covered-conductor': 26 }
const base = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const errors = []
const mediaRequests = []
await mkdir('test-results', { recursive: true })

async function open(slug, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options })
  page.on('pageerror', error => errors.push(`${slug}: ${error.message}`))
  page.on('request', request => { if (/\.(mp4|webm)(\?|$)/.test(request.url())) mediaRequests.push(request.url()) })
  const response = await page.goto(`${base}/products/${slug}/`, { waitUntil: 'domcontentloaded' })
  assert.equal(response.status(), 200)
  return page
}
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
async function accessibility(page) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
  const violations = await page.evaluate(async () => (await axe.run('main', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })))
  assert.deepEqual(violations, [])
}

try {
  assert.equal(createHash('sha256').update(await readFile('public/media/catalogue.pdf')).digest('hex'), 'b8382eb6a3ce8189d9750d458df998e555045e3a47e984eee20653a2c935af0a', 'The supplied 2026 catalogue is served')
  for (const [slug, tables] of Object.entries(specifications)) {
    assert.equal(tables.reduce((n, table) => n + table.rows.length, 0), expectedCounts[slug], `${slug} retains every source entry`)
    for (const table of tables) {
      assert.ok(table.page >= 1 && table.page <= (table.source === 'catalogue.pdf' ? 30 : 2))
      assert.equal(table.summaryColumns.length, 3)
      for (const row of table.rows) {
        assert.equal(row.length, table.columns.length)
        assert.ok(row.every(value => typeof value === 'string' && value && !value.includes('(cid:')))
      }
    }
  }
  assert.deepEqual(specifications['al-59'][0].rows[0].slice(-3), ['0.943', '120', '142'], 'AL-59 resistance and current columns remain separate')
  assert.deepEqual(specifications['eco-panther'][0].rows[2].slice(5, 10), ['22', '973', '81.95', '0.08', '698'], 'ECO Panther 353 matches catalogue page 15')

  for (const product of catalogue) {
    const page = await open(product.slug)
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1)
    assert.equal(await page.locator('video').count(), 0, `${product.slug} has no raw video player`)
    await page.locator('[data-product-viewer] canvas[data-ready=yes]').waitFor({ timeout: 30000 })
    assert.ok((await page.locator('link[rel=canonical]').getAttribute('href')).endsWith(`/products/${product.slug}/`))
    assert.ok(await fits(page))
    assert.equal((await page.request.get(`${base}/media/products/${product.slug}.webp`)).status(), 200)
    if (!expectedCounts[product.slug]) {
      assert.equal(await page.getByRole('heading', { name: 'Specify it with PCI.' }).count(), 1)
      assert.equal(await page.locator('[data-spec-entry]').count(), 0)
    }
    await page.close()
  }

  const page = await open('aac')
  const canvas = page.locator('[data-product-viewer] canvas[data-ready=yes]')
  await canvas.waitFor()
  const initial = await canvas.screenshot()
  await page.waitForTimeout(200)
  assert.equal(initial.equals(await canvas.screenshot()), true, 'Manual model stays still without input')
  await page.getByRole('button', { name: 'Rotate product right' }).click()
  await page.waitForTimeout(150)
  assert.equal(initial.equals(await canvas.screenshot()), false, 'Rotation changes the actual 3D view')
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.waitForTimeout(150)
  assert.equal(initial.equals(await canvas.screenshot()), true, 'Reset restores the original pose')
  await page.getByLabel('Separate layers', { exact: true }).focus()
  await page.keyboard.press('End')
  await page.waitForTimeout(150)
  assert.equal(initial.equals(await canvas.screenshot()), false, 'Layer separation changes the geometry')
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  const stage = page.getByRole('group', { name: 'AAC 3D construction' })
  await stage.focus(); await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(150)
  assert.equal(initial.equals(await canvas.screenshot()), false, 'Keyboard rotates the model')
  await page.keyboard.press('Home')
  await page.evaluate(() => { window.productPageToken = 'stays-mounted' })
  await page.getByRole('link', { name: 'Explore sizes & data' }).click()
  await page.getByRole('button', { name: 'Next →', exact: true }).click()
  assert.ok((await page.getByRole('navigation', { name: 'Specification pages' }).textContent()).includes('Page 2 of 9'))
  assert.equal(await page.evaluate(() => window.productPageToken), 'stays-mounted', 'Pagination does not reload the page')
  const search = page.getByRole('searchbox', { name: 'Find a size or code word' })
  await search.fill('BULL')
  assert.equal(await page.locator('[data-spec-entry]').count(), 1)
  const bull = page.locator('[data-spec-entry]')
  await bull.locator('summary').click()
  for (const value of ['61/4.25', '38.25', '2400']) assert.ok((await bull.textContent()).includes(value))
  await search.fill('6.63 mm')
  assert.equal(await page.locator('[data-spec-entry]').count(), 2, 'Diameter search includes both relevant standards')
  await page.getByLabel('Standard or construction').selectOption('aac-1')
  assert.equal(await page.locator('[data-spec-entry]').count(), 1)
  await search.fill('does-not-exist')
  await page.getByRole('button', { name: 'Show all entries' }).click()
  assert.equal(await page.locator('[data-spec-entry]').count(), 12)
  await accessibility(page)
  await page.screenshot({ path: 'test-results/product-directory-desktop.png' })

  const mobile = await open('acsr', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await mobile.locator('[data-product-viewer] canvas[data-ready=yes]').waitFor()
  await mobile.locator('[data-product-viewer]').screenshot({ path: 'test-results/product-viewer-mobile.png' })
  await mobile.getByRole('link', { name: 'Explore sizes & data' }).tap()
  assert.ok(await fits(mobile))
  await mobile.locator('[data-spec-entry] summary').first().tap()
  await accessibility(mobile)
  await mobile.screenshot({ path: 'test-results/product-directory-mobile.png' })
  await mobile.setViewportSize({ width: 720, height: 500 })
  assert.ok(await fits(mobile), 'Directory fits at 200% equivalent width')
  await mobile.close()

  const staticPage = await open('aac', { javaScriptEnabled: false })
  assert.equal(await staticPage.locator('[data-spec-entry]').count(), 108, 'Every AAC entry is server rendered')
  await staticPage.locator('[data-spec-entry] summary').first().click()
  assert.equal(await staticPage.locator('[data-spec-entry]').first().getAttribute('open'), '', 'Native disclosure works without JavaScript')
  assert.ok(await staticPage.locator('[data-product-viewer] img').first().evaluate(async img => { await img.decode(); return img.naturalWidth > 0 }))
  await staticPage.close()

  const noGPU = await browser.newPage({ reducedMotion: 'reduce' })
  await noGPU.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args) }
  })
  await noGPU.goto(`${base}/products/aaac/`, { waitUntil: 'domcontentloaded' })
  await noGPU.getByRole('heading', { name: 'Product information.' }).waitFor()
  assert.equal(await noGPU.getByRole('button', { name: 'Rotate product right' }).isDisabled(), true)
  assert.ok(await noGPU.locator('[data-product-viewer] img').first().evaluate(async img => { await img.decode(); return img.naturalWidth > 0 }))
  await noGPU.close()
  assert.deepEqual(mediaRequests, [], 'Product pages never request video files')
  assert.deepEqual(errors, [])
  console.log('All 14 product models, 784 catalogue entries, manual controls, filtering, pagination, source values, mobile, accessibility and static fallback passed.')
} finally { await browser.close() }
