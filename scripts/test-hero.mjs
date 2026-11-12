// Homepage hero film checks. Needs the site running (pnpm dev) at PCI_BROWSER_URL, default http://127.0.0.1:3000/.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'
const require = createRequire(import.meta.url)
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const url = process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000/'
await mkdir('test-results', {recursive:true})
const errors = []
async function open(options = {}) {
  const page = await browser.newPage({viewport:{width:1440, height:950}, ...options})
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url, {waitUntil:'domcontentloaded'})
  await page.locator('.hero-film').waitFor()
  return page
}
const axe = async page => {
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')})
  const violations = await page.evaluate(async () => (await window.axe.run('.hero-film', {runOnly:{type:'tag', values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations)
  return violations.map(v => ({id:v.id, nodes:v.nodes.map(n => n.target)}))
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
try {
  for (const file of ['landscape.webm', 'landscape.mp4', 'landscape.webp', 'portrait.webm', 'portrait.mp4', 'portrait.webp']) {
    const response = await fetch(new URL(`/media/pci-hero-film-${file}`, url), {method:'HEAD'})
    assert.equal(response.status, 200, `${file} is served`)
  }
  const page = await open()
  assert.equal(await page.locator('h1').count(), 1, 'One page heading')
  assert.equal(await page.locator('h1').innerText(), 'Engineered to carry the current.')
  await page.waitForFunction(() => document.querySelector('.hero-film')?.dataset.film === 'playing', null, {timeout:15000})
  const start = await page.locator('.hero-film-video').evaluate(v => v.currentTime)
  await page.waitForTimeout(1200)
  assert.ok(await page.locator('.hero-film-video').evaluate(v => v.currentTime) > start, 'Film plays')
  assert.equal(await page.locator('.hero-film-video').evaluate(v => v.currentSrc.includes('landscape')), true, 'Desktop uses the landscape film')
  await page.screenshot({path:'test-results/hero-desktop.png'})
  await page.getByRole('button', {name:'Pause background film'}).click()
  await page.getByRole('button', {name:'Play background film'}).waitFor()
  assert.equal(await page.locator('.hero-film-video').evaluate(v => v.paused), true, 'Pause button stops the film')
  await page.getByRole('button', {name:'Play background film'}).click()
  await page.getByRole('button', {name:'Pause background film'}).waitFor()
  await page.evaluate(() => window.scrollTo({top:document.querySelector('.hero-film').offsetHeight + 400, behavior:'instant'}))
  await page.waitForFunction(() => document.querySelector('.hero-film-video').paused)
  await page.evaluate(() => window.scrollTo({top:0, behavior:'instant'}))
  await page.waitForFunction(() => !document.querySelector('.hero-film-video').paused)
  assert.deepEqual(await axe(page), [], 'Hero accessibility')
  assert.equal(await page.getByRole('navigation', {name:'Product families', exact:true}).count(), 0, 'Hero product family strip is removed')
  const short = await open({viewport:{width:1055, height:772}})
  const fit = await short.evaluate(() => {
    const r = s => document.querySelector(s).getBoundingClientRect()
    const hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)
    return {bar:hit(r('.hero-film-bar'), r('.info-trigger')) && hit(r('.hero-facts'), r('.info-trigger')), onScreen:r('.hero-film-actions').bottom <= innerHeight}
  })
  assert.equal(fit.bar, false, 'Quick info button does not cover the facts')
  assert.equal(fit.onScreen, true, 'Hero actions fit above the fold at 1055 × 772')
  await short.waitForTimeout(1500)
  await short.screenshot({path:'test-results/hero-1055.png'})
  const reduced = await open({reducedMotion:'reduce'})
  await reduced.waitForTimeout(800)
  assert.equal(await reduced.locator('.hero-film-video').evaluate(v => v.paused && v.readyState === 0), true, 'Reduced motion does not download or play the film')
  assert.equal(await reduced.locator('.hero-film-poster').isVisible(), true, 'Reduced motion shows the poster')
  await reduced.getByRole('button', {name:'Play background film'}).click()
  await reduced.waitForFunction(() => document.querySelector('.hero-film')?.dataset.film === 'playing', null, {timeout:15000})
  const paused = await open()
  await paused.evaluate(() => { localStorage.setItem('pci-pause-motion', 'yes') })
  await paused.reload({waitUntil:'domcontentloaded'})
  await paused.waitForTimeout(800)
  assert.equal(await paused.locator('.hero-film-video').evaluate(v => v.paused), true, 'Saved pause keeps the film still')
  const mobile = await open({viewport:{width:390, height:844}, isMobile:true, hasTouch:true})
  await mobile.waitForFunction(() => document.querySelector('.hero-film')?.dataset.film === 'playing', null, {timeout:15000})
  assert.equal(await mobile.locator('.hero-film-video').evaluate(v => v.currentSrc.includes('portrait')), true, 'Phones use the portrait film')
  assert.equal(await overflow(mobile), false, 'No horizontal overflow on phones')
  assert.deepEqual(await axe(mobile), [], 'Phone hero accessibility')
  await mobile.waitForTimeout(1000)
  await mobile.screenshot({path:'test-results/hero-mobile.png'})
  const noJS = await open({javaScriptEnabled:false})
  assert.equal(await noJS.locator('.hero-film-poster').isVisible(), true, 'No-JavaScript poster')
  assert.equal(await noJS.locator('h1').evaluate(h => getComputedStyle(h).opacity), '1', 'No-JavaScript heading visible')
  assert.deepEqual(errors, [])
  console.log('Hero: film playback, removed product strip, pause/play, offscreen pause, reduced motion, saved pause, phone portrait film, no-JS poster and accessibility passed.')
} finally { await browser.close() }
