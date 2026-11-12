// Homepage "Explore the range" section: the cable film plays on its own and the layer list follows it.
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
const selector = 'section[aria-labelledby="product-film-heading"]'
async function open(options = {}) {
  const page = await browser.newPage({viewport:{width:1440, height:950}, ...options})
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url, {waitUntil:'domcontentloaded'})
  await page.locator(selector).waitFor()
  if (options.javaScriptEnabled !== false) await page.locator(`${selector}[data-ready=yes]`).waitFor({state:'attached'})
  return page
}
const show = page => page.locator(selector).evaluate(el => el.scrollIntoView({block:'center', behavior:'instant'}))
const state = page => page.locator(`${selector} [data-layer]`).evaluateAll(items => items.map(li => li.dataset.state))
const film = page => page.locator(`${selector} video`)
const playing = (page, timeout = 20000) => page.waitForFunction(s => { const v = document.querySelector(`${s} video`); return v && !v.paused && v.readyState >= 2 }, selector, {timeout})
const axe = async page => {
  if (!await page.evaluate(() => 'axe' in window)) await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')})
  const violations = await page.evaluate(async s => (await window.axe.run(s, {runOnly:{type:'tag', values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations, selector)
  return violations.map(v => ({id:v.id, nodes:v.nodes.map(n => n.target)}))
}
try {
  for (const file of ['pci-cable-film.mp4', 'pci-cable-film-final.webp']) {
    assert.equal((await fetch(new URL(`/media/${file}`, url), {method:'HEAD'})).status, 200, `${file} is served`)
  }
  const page = await open()
  assert.equal(await film(page).evaluate(v => v.readyState === 0 && !v.currentSrc), true, 'Film waits until the section is on screen')
  assert.ok(await page.locator(selector).evaluate(el => el.offsetHeight < innerHeight * 1.6), 'Section scrolls normally (not pinned)')
  await show(page)
  await playing(page)
  assert.equal(await page.locator(selector).getAttribute('data-mode'), 'flow')
  assert.equal(await film(page).evaluate(v => v.videoWidth), 1920, 'Full HD film')
  const t0 = await film(page).evaluate(v => v.currentTime)
  await page.waitForTimeout(1000)
  assert.ok(await film(page).evaluate(v => v.currentTime) > t0, 'Film runs automatically')
  await film(page).evaluate(v => { v.currentTime = .3 })
  await page.waitForFunction(s => document.querySelector(s).dataset.layer === '0', selector)
  await page.screenshot({path:'test-results/product-film-start.png'})
  await film(page).evaluate(v => { v.currentTime = 3.8 })
  await page.waitForFunction(s => document.querySelector(s).dataset.layer === '3', selector)
  assert.deepEqual(await state(page), ['done', 'done', 'done', 'active', 'next'], 'Layers accumulate as the film plays')
  await page.screenshot({path:'test-results/product-film-middle.png'})
  await film(page).evaluate(v => { v.currentTime = 11.6 })
  await page.waitForFunction(s => document.querySelector(s).dataset.layer === '5', selector)
  assert.deepEqual(await state(page), ['done', 'done', 'done', 'done', 'done'], 'Finished cable completes the list')
  await page.screenshot({path:'test-results/product-film-end.png'})
  await page.getByRole('button', {name:'Pause cable film'}).click()
  assert.equal(await film(page).evaluate(v => v.paused), true, 'Pause button stops the film')
  await page.getByRole('button', {name:'Play cable film'}).click()
  await playing(page)
  await page.evaluate(() => scrollTo({top:0, behavior:'instant'}))
  await page.waitForFunction(s => document.querySelector(`${s} video`).paused, selector)
  await show(page)
  await playing(page)
  assert.deepEqual(await axe(page), [], 'Accessibility')
  assert.equal(await page.locator(selector).getByRole('link', {name:'View all 14 products'}).getAttribute('href'), '/products/')
  const short = await open({viewport:{width:1055, height:772}})
  await show(short)
  await playing(short)
  await short.waitForTimeout(1500)
  await short.screenshot({path:'test-results/product-film-1055.png'})
  const mobile = await open({viewport:{width:390, height:844}, isMobile:true, hasTouch:true})
  await mobile.locator(`${selector} video`).scrollIntoViewIfNeeded()
  await playing(mobile)
  await mobile.getByRole('button', {name:'Pause cable film'}).click()
  assert.equal(await film(mobile).evaluate(v => v.paused), true, 'Phone film pauses on request')
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No sideways scroll on phones')
  assert.deepEqual(await axe(mobile), [], 'Phone accessibility')
  await mobile.locator(selector).screenshot({path:'test-results/product-film-mobile.png'})
  const reduced = await open({reducedMotion:'reduce'})
  await show(reduced)
  await reduced.waitForTimeout(800)
  assert.equal(await reduced.locator(selector).getAttribute('data-mode'), 'static')
  assert.equal(await film(reduced).evaluate(v => v.readyState === 0 && !v.currentSrc), true, 'Reduced motion never loads the film')
  assert.deepEqual(await state(reduced), ['done', 'done', 'done', 'done', 'done'])
  await reduced.getByRole('button', {name:'Play cable film'}).click()
  await playing(reduced)
  const noJS = await open({javaScriptEnabled:false})
  assert.equal(await noJS.locator(`${selector} img`).first().isVisible(), true, 'No-JavaScript poster')
  assert.equal(await noJS.locator(`${selector} ol li`).count(), 5, 'No-JavaScript layer list')
  assert.deepEqual(errors, [])
  console.log('Product film: autoplay on screen, normal scrolling, layers follow playback, pause/play, offscreen pause, phone layout, reduced-motion opt-in, no-JS and accessibility passed.')
} finally { await browser.close() }
