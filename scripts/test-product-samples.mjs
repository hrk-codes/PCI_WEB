// Product pages: "See it up close" films of PCI's real display samples.
// Needs the site running (pnpm dev) at PCI_BROWSER_URL, default http://127.0.0.1:3000/.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'
const require = createRequire(import.meta.url)
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const base = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
await mkdir('test-results', {recursive:true})
const errors = []
const withFilm = ['acsr', 'aac', 'eco-panther', 'gi-earth-wire', 'aerial-bunched-cable', 'covered-conductor', 'control-cable', 'lt-xlpe-cable', 'pvc-power-cable']
async function open(slug, options = {}) {
  const page = await browser.newPage({viewport:{width:1440, height:950}, ...options})
  page.on('pageerror', e => errors.push(`${slug}: ${e.message}`))
  await page.goto(`${base}/products/${slug}/`, {waitUntil:'domcontentloaded'})
  return page
}
const film = page => page.locator('.sample-film video')
try {
  for (const slug of withFilm) {
    for (const ext of ['mp4', 'webp']) assert.equal((await fetch(`${base}/media/samples/${slug}.${ext}`, {method:'HEAD'})).status, 200, `${slug}.${ext} is served`)
  }
  for (const slug of withFilm) {
    const page = await open(slug)
    assert.equal(await page.locator('.sample-film').count(), 1, `${slug} shows its sample film`)
    assert.equal(await film(page).evaluate(v => !v.currentSrc), true, `${slug} film waits until it is on screen`)
    await page.locator('.sample-film').scrollIntoViewIfNeeded()
    await page.waitForFunction(() => { const v = document.querySelector('.sample-film video'); return v && !v.paused && v.readyState >= 2 }, null, {timeout:20000})
    const size = await film(page).evaluate(v => [v.videoWidth, v.videoHeight])
    assert.deepEqual(size, [864, 1536], `${slug} film is portrait 864×1536`)
    if (slug === 'acsr') {
      await page.getByRole('button', {name:'Pause sample film'}).click()
      assert.equal(await film(page).evaluate(v => v.paused), true, 'Pause button stops the film')
      await page.getByRole('button', {name:'Play sample film'}).click()
      await page.waitForFunction(() => !document.querySelector('.sample-film video').paused)
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')})
      const violations = await page.evaluate(async () => (await window.axe.run('.sample-film', {runOnly:{type:'tag', values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations)
      assert.deepEqual(violations.map(v => v.id), [], 'Accessibility')
      await page.locator('.sample-film').screenshot({path:'test-results/sample-film-acsr.png'})
    }
    await page.close()
  }
  const without = await open('aaac')
  assert.equal(await without.locator('.sample-film').count(), 0, 'Products without footage keep their page as it was')
  const reduced = await open('aac', {reducedMotion:'reduce'})
  await reduced.locator('.sample-film').scrollIntoViewIfNeeded()
  await reduced.waitForTimeout(800)
  assert.equal(await film(reduced).evaluate(v => !v.currentSrc && v.paused), true, 'Reduced motion shows the poster without loading the film')
  await reduced.getByRole('button', {name:'Play sample film'}).click()
  await reduced.waitForFunction(() => !document.querySelector('.sample-film video').paused, null, {timeout:20000})
  const mobile = await open('lt-xlpe-cable', {viewport:{width:390, height:844}, isMobile:true, hasTouch:true})
  await mobile.locator('.sample-film').scrollIntoViewIfNeeded()
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No page overflow on phones')
  await mobile.locator('.sample-film').screenshot({path:'test-results/sample-film-mobile.png'})
  assert.deepEqual(errors, [])
  console.log(`Product sample films: ${withFilm.length} pages play their sample when on screen, pause/play, reduced motion, phone layout and accessibility passed.`)
} finally { await browser.close() }
