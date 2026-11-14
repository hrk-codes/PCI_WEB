// About us page: content, the 3D PCI mark, entrances, accessibility and layout at desktop, tablet and phone sizes.
// Usage: node scripts/test-about-page.mjs            (dev server on PCI_BROWSER_URL, default http://127.0.0.1:3000)
//        node scripts/test-about-page.mjs --frames   (also saves intro frames of the 3D mark to test-results/)
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'
import sharp from 'sharp'
const require = createRequire(import.meta.url)
const base = process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000'
const url = base.replace(/\/$/, '') + '/about-us/'
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args:['--enable-gpu', '--ignore-gpu-blocklist']})
await mkdir('test-results', {recursive:true})
const errors = []
async function open(viewport, options = {}) {
  const page = await browser.newPage({viewport, ...options})
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(url, {waitUntil:'networkidle'})
  return page
}
const axe = async page => {
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')})
  const violations = await page.evaluate(async () => (await window.axe.run('[data-about]', {runOnly:{type:'tag', values:['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})).violations)
  return violations.map(v => ({id:v.id, nodes:v.nodes.map(n => n.target)}))
}
async function revealAll(page) {
  const height = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < height; y += 500) { await page.evaluate(y => window.scrollTo({top:y, behavior:'instant'}), y); await page.waitForTimeout(140) }
  await page.waitForTimeout(1600)
  await page.waitForFunction(() => [...document.querySelectorAll("[data-about] img")].every(i => i.complete && i.naturalWidth > 0), null, {timeout:45000})
}

// Desktop: content, 3D mark, entrances, accessibility.
{
  const page = await open({width:1440, height:900})
  assert.equal(await page.locator('h1').innerText(), 'Built in Bengal. Strung across India and beyond.')
  for (const heading of ['A cable and conductor works built for the grid.', 'One works. Three families. Every span of the network.', 'Certified systems. Licensed products. Tested in-house.', 'From the drum to the finished line.', 'Since 2013, span by span.'])
    assert.equal(await page.getByRole('heading', {name:heading}).count(), 1, `heading: ${heading}`)
  assert.equal(await page.locator('[data-about] dl dd').count(), 5, 'five facts')
  for (const href of ['/cables/', '/conductors/', '/earth-wire/', '/certificates/', '/testing/', '/epc/', '/achievements/', '/request-quote/'])
    assert.ok(await page.locator(`[data-about] a[href="${href}"]`).count(), `links to ${href}`)
  assert.equal(await page.getByText('Industries Pvt. Ltd.', {exact:true}).count(), 0, 'no company suffix line in the logo stage')
  const phase = () => page.locator('[data-about] canvas').evaluate(c => c.parentElement.dataset.phase)
  await page.waitForFunction(() => document.querySelector('[data-about] canvas')?.parentElement?.dataset.ready === 'yes', null, {timeout:15000})
  assert.equal(await phase(), 'intro', 'the intro plays on arrival')
  if (process.argv.includes('--frames')) {
    let previous = 0
    for (const t of [400, 1100, 1700, 2300, 3200, 5200]) {
      await page.waitForTimeout(t - previous); previous = t
      await page.locator('[data-about] canvas').screenshot({path:`test-results/about-logo-${String(t).padStart(4, '0')}.png`})
    }
  }
  await page.waitForTimeout(5200)
  // The finished mark must be drawn (not blank): sample the canvas for brand orange and blue pixels.
  const shot = await page.locator('[data-about] canvas').screenshot()
  const {data} = await sharp(shot).resize(240, 192).raw().toBuffer({resolveWithObject:true})
  const colours = {orange:0, blue:0}
  for (let i = 0; i < data.length; i += 3) { if (data[i] > 190 && data[i + 1] > 80 && data[i + 1] < 170 && data[i + 2] < 90) colours.orange++; if (data[i + 2] > 170 && data[i] < 110) colours.blue++ }
  assert.ok(colours.orange > 400 && colours.blue > 400, `3D mark drawn in brand colours (${JSON.stringify(colours)})`)
  await page.screenshot({path:'test-results/about-page-hero.png'})
  assert.equal(await phase(), 'rest', 'the finished mark rests')
  assert.equal(await page.getByText(/Fig. 01|Replay/).count(), 0, 'no caption or Replay button')
  await page.getByRole('button', {name:'Play the PCI logo animation'}).click()
  await page.waitForTimeout(250)
  assert.equal(await phase(), 'rewind', 'a click un-draws the mark')
  await page.waitForTimeout(1200)
  assert.equal(await phase(), 'intro', 'then plays it again')
  await page.waitForFunction(() => document.querySelector('[data-about] canvas').parentElement.dataset.phase === 'rewind', null, {timeout:17000})
  await revealAll(page)
  assert.equal(await page.locator('[data-reveal=waiting]').count(), 0, 'every block revealed after scrolling')
  assert.equal(await page.locator('[data-count-to="14"]').innerText(), '14')
  assert.deepEqual(await axe(page), [], 'axe')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal overflow at 1440')
  await page.screenshot({path:'test-results/about-page-full.png', fullPage:true})
  await page.close()
}

// Reduced motion: no hidden blocks, finished mark.
{
  const page = await open({width:1280, height:800}, {reducedMotion:'reduce'})
  assert.equal(await page.locator('[data-reveal=waiting]').count(), 0, 'reduced motion shows everything')
  await page.waitForFunction(() => document.querySelector('[data-about] canvas')?.parentElement?.dataset.phase === 'still', null, {timeout:15000})
  assert.equal(await page.getByRole('button', {name:'Play the PCI logo animation'}).count(), 0, 'no play control when motion is reduced')
  await page.close()
}

// Tablet and phone layouts.
for (const [width, height] of [[820, 1180], [390, 844]]) {
  const page = await open({width, height}, {isMobile:width < 500, hasTouch:width < 500})
  await revealAll(page)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `no horizontal overflow at ${width}`)
  const stage = await page.locator('[data-about] canvas').boundingBox()
  assert.ok(stage && stage.x >= 0 && stage.x + stage.width <= width + 1, `logo stage fits at ${width}`)
  await page.screenshot({path:`test-results/about-page-${width}.png`, fullPage:true})
  await page.close()
}

await browser.close()
assert.deepEqual(errors, [], 'no page errors')
console.log('About page checks passed')
