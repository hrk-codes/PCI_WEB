// Product-link navigation must start at the top without an animated upward sweep.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'

const require = createRequire(import.meta.url)
const base = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
await mkdir('test-results', { recursive: true })
const errors = []

async function follow(page, link, path) {
  await link.scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  const originY = await page.evaluate(() => scrollY)
  await page.evaluate(() => {
    window.productNavigationWatch = { samples: [], frame: 0 }
    function sample() {
      const watch = window.productNavigationWatch
      watch.samples.push({ path: location.pathname, y: scrollY })
      watch.frame = requestAnimationFrame(sample)
    }
    sample()
  })
  await link.click()
  await page.waitForURL(base + path)
  await page.getByRole('heading', { level: 1 }).waitFor()
  await page.waitForTimeout(250)
  const samples = await page.evaluate(() => {
    cancelAnimationFrame(window.productNavigationWatch.frame)
    return window.productNavigationWatch.samples
  })
  const destination = samples.filter(sample => sample.path === path)
  assert.ok(destination.length > 0, 'Client navigation preserves the scroll observer')
  assert.ok(destination.every(sample => sample.y <= 1), `${path} starts at the top in every rendered frame`)
  assert.equal(await page.evaluate(() => scrollY), 0)
  assert.equal(await page.locator('html').getAttribute('data-scroll-behavior'), 'smooth')
  return originY
}

async function checkPage(page, name, { skipScrolledNav = false } = {}) {
  // Scan only once smooth scrolling has come to rest: mid-scroll, links pass under the sticky header.
  await page.waitForFunction(() => new Promise(resolve => { let last = scrollY, still = 0; const tick = () => { still = scrollY === last ? still + 1 : 0; last = scrollY; still >= 5 ? resolve(true) : requestAnimationFrame(tick) }; requestAnimationFrame(tick) }))
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} fits the viewport`)
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
  const violations = await page.evaluate(async skip => (await axe.run(skip ? { include: [['main']], exclude: [['nav[aria-label="On this product page"]']] } : 'main', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), skipScrolledNav)
  assert.deepEqual(violations, [], `${name} accessibility`)
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, reducedMotion: 'no-preference' })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  const homeY = await follow(page, page.locator('.conductor-line a[href="/products/eco-panther/"]'), '/products/eco-panther/')
  assert.ok(homeY > 1000, 'Navigation starts from the lower homepage')
  await page.goBack()
  await page.waitForURL(base + '/')
  await page.waitForFunction(y => Math.abs(scrollY - y) < 35, homeY)
  await follow(page, page.locator('.conductor-line a[href="/products/eco-panther/"]'), '/products/eco-panther/')
  await follow(page, page.locator('a.product-card[href="/products/aac/"]'), '/products/aac/')
  await page.getByRole('link', { name: 'Explore sizes & data' }).click()
  await page.waitForFunction(() => {
    const heading = document.getElementById('product-specifications-title').getBoundingClientRect()
    return heading.top > 150 && heading.top < 300
  })
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'smooth', 'In-page scrolling retains its smooth behavior')
  await checkPage(page, 'Desktop specifications')
  await page.screenshot({ path: 'test-results/product-spacing-desktop.png' })
  await page.setViewportSize({ width: 720, height: 500 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Zoomed layout fits')
  await page.close()

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' })
  mobile.on('pageerror', error => errors.push(error.message))
  await mobile.goto(base + '/products/', { waitUntil: 'domcontentloaded' })
  await follow(mobile, mobile.locator('a.product-card[href="/products/control-cable/"]'), '/products/control-cable/')
  await mobile.getByRole('link', { name: 'Explore the construction' }).click()
  await mobile.waitForFunction(() => {
    const heading = document.getElementById('product-overview-title').getBoundingClientRect()
    return heading.top > 100 && heading.top < 260
  })
  // On a phone the page menu is not sticky: at this point it has scrolled up behind the site header.
  await checkPage(mobile, 'Mobile product information', { skipScrolledNav: true })
  await mobile.screenshot({ path: 'test-results/product-spacing-mobile.png' })
  await mobile.close()
  assert.deepEqual(errors, [])
  console.log('Product navigation starts at the top without an upward sweep. Back restoration, anchors, compact desktop/mobile layouts, zoom and accessibility passed.')
} finally { await browser.close() }
