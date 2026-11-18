// Capabilities pages: testing facilities and certifications. (EPC & turnkey was retired from the site.)
//   node scripts/test-capabilities.mjs   (site running at PCI_BROWSER_URL, default http://127.0.0.1:3000/)
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'
const require = createRequire(import.meta.url)
const base = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000/').replace(/\/$/, '')
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const errors = []
async function open(path, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...options })
  page.on('pageerror', e => errors.push(`${path}: ${e.message}`))
  const response = await page.goto(base + path, { waitUntil: 'networkidle' })
  assert.equal(response.status(), 200, `${path} loads`)
  return page
}
const axe = async page => {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
  return page.evaluate(async () => (await window.axe.run('[data-capability]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => v.id))
}
try {
  for (const path of ['/testing/', '/certificates/']) {
    // Reduced motion: the accessibility audit must not catch blocks halfway through their entrance.
    const page = await open(path, { reducedMotion: 'reduce' })
    assert.equal(await page.locator('h1').count(), 1, `${path}: one h1`)
    assert.equal(await page.locator('nav[aria-label=Capabilities] a').count(), 2, `${path}: capability bar links both pages`)
    assert.equal(await page.locator(`nav[aria-label=Capabilities] a[href="${path}"]`).getAttribute('aria-current'), 'page', `${path}: bar marks the current page`)
    assert.equal(await page.locator('[data-capability] a[href="/request-quote/"]').count() > 0, true, `${path}: offers a quote`)
    assert.deepEqual(await axe(page), [], `${path}: accessibility`)
    await page.close()
    const phone = await open(path, { viewport: { width: 390, height: 844 }, isMobile: true })
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path}: no sideways scroll on a phone`)
    await phone.close()
  }

  const testing = await open('/testing/')
  const cards = testing.locator('#tests ol > li')
  assert.equal(await cards.count(), 25, 'All 25 tests are listed')
  assert.equal(await testing.locator('#tests ol > li:visible').count(), 25, 'All tests show by default')
  await testing.getByRole('button', { name: /Fire performance/ }).click()
  assert.equal(await testing.locator('#tests ol > li:visible').count(), 5, 'Fire filter shows five tests')
  assert.equal(await testing.getByRole('button', { name: /Fire performance/ }).getAttribute('aria-pressed'), 'true', 'Filter state is announced')
  await testing.getByRole('button', { name: /All tests/ }).click()
  assert.equal(await testing.locator('#tests ol > li:visible').count(), 25, 'All tests return')
  await testing.close()

  const certificates = await open('/certificates/')
  assert.equal(await certificates.locator('#bis ol > li').count(), 8, 'Eight BIS licences')
  assert.equal(await certificates.locator('#iso article').count(), 3, 'Three ISO certificates')
  await certificates.getByRole('link', { name: 'View the ISO 14001:2015 certificate' }).click()
  const dialog = certificates.locator('dialog[open]')
  await dialog.waitFor()
  assert.match(await dialog.innerText(), /ISO 14001:2015/, 'Certificate dialog opens on the chosen certificate')
  await dialog.getByRole('button', { name: 'Next certificate' }).click()
  assert.match(await dialog.innerText(), /ISO 45001:2018/, 'Next steps to the following certificate')
  await certificates.keyboard.press('Escape')
  assert.equal(await certificates.locator('dialog[open]').count(), 0, 'Escape closes the dialog')
  for (const href of await certificates.locator('#bis a').evaluateAll(links => links.map(a => a.getAttribute('href')))) {
    const response = await certificates.request.get(base + href)
    assert.equal(response.status(), 200, `Licence product link ${href} works`)
  }
  await certificates.close()

  const retired = await browser.newPage()
  assert.equal((await retired.goto(base + '/epc/')).status(), 404, 'The retired EPC page is gone')
  assert.equal(await retired.locator('a[href="/epc/"]').count(), 0, 'No link points to the retired EPC page')
  await retired.close()

  assert.deepEqual(errors, [], 'No page errors')
  console.log('Capabilities: testing and certification pages, capability bar, test filter, certificate dialog, licence links, retired EPC page, phone layout and accessibility passed.')
} finally { await browser.close() }
