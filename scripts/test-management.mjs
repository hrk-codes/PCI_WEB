// Management page: leadership structure, leader cards, contacts and landline, phone layout and accessibility.
//   node scripts/test-management.mjs   (site running at PCI_BROWSER_URL, default http://127.0.0.1:3000/)
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'
const require = createRequire(import.meta.url)
const base = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000/').replace(/\/$/, '')
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
await mkdir('test-results', { recursive: true })
const errors = []
async function open(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...options })
  page.on('pageerror', e => errors.push(e.message))
  const response = await page.goto(base + '/management/', { waitUntil: 'networkidle' })
  assert.equal(response.status(), 200, 'Management page loads')
  return page
}
const leaders = ['Harsh Narayan Jha', 'Prakash Jha', 'Ranjeet Kumar']
const portraits = ['harsh-narayan-jha', 'prakash-jha', 'ranjeet-kumar']
const portraitName = src => portraits.find(name => src.includes(name))
try {
  // Reduced motion: the accessibility audit must not catch blocks halfway through their entrance.
  const page = await open({ reducedMotion: 'reduce' })
  assert.equal(await page.locator('h1').count(), 1, 'One page heading')
  assert.match(await page.locator('h1').innerText(), /Led from Dankuni/)
  const structure = page.locator('ul[aria-label="Leadership structure"] > li')
  assert.equal(await structure.count(), 3, 'The structure shows the three leaders')
  assert.deepEqual(await structure.evaluateAll(items => items.map(li => li.querySelector('small').textContent + ': ' + li.querySelector('b').textContent)),
    ['Chairman: Shri Harsh Narayan Jha', 'Managing Director: Shri Prakash Jha', 'AVP · Sales & BD: Shri Ranjeet Kumar'], 'Chairman, then the managing director, then sales and business development')
  const cards = page.locator('#leadership ol > li')
  assert.deepEqual(await cards.locator('h3').allInnerTexts(), leaders, 'Leader cards in order')
  assert.equal(await page.locator('[data-management]', { hasText: 'Ranju' }).count(), 0, 'Ranju Devi Jha is no longer listed')
  // Each portrait loads, matches its card and has a descriptive alternative text; the structure shows the same faces.
  const cardPhotos = await cards.locator('img').evaluateAll(imgs => Promise.all(imgs.map(async img => { await img.decode(); return { src: decodeURIComponent(img.currentSrc), alt: img.alt, width: img.naturalWidth } })))
  assert.equal(cardPhotos.length, 3, 'One portrait per leader')
  cardPhotos.forEach((photo, i) => {
    assert.ok(photo.src.includes(portraits[i]), `${leaders[i]}: the right portrait`)
    assert.ok(photo.width > 300 && photo.alt.includes(leaders[i]), `${leaders[i]}: a sharp portrait with alternative text`)
  })
  assert.deepEqual((await structure.locator('img').evaluateAll(imgs => imgs.map(img => decodeURIComponent(img.currentSrc || img.src)))).map(portraitName), portraits, 'The structure shows each leader\'s face')
  assert.equal(await page.locator('main img[src*="blank-id-avatar"], main img[src*="directors"]').count(), 0, 'The placeholder avatar and stock boardroom picture are gone')
  assert.equal(await page.locator('nav[aria-label=Company]').count(), 0, 'No Company bar on this page')
  assert.deepEqual(await page.locator('[data-management] a[href^="tel:"]').evaluateAll(links => links.map(a => a.getAttribute('href'))),
    ['tel:+919990301351', 'tel:+919062207003', 'tel:+919062207005', 'tel:+919062207010', 'tel:+913212230691'], 'Sales (two numbers), purchase, HR and the office landline are callable')
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
  const violations = await page.evaluate(async () => (await window.axe.run('[data-management]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })))
  assert.deepEqual(violations, [], 'Accessibility')
  await page.screenshot({ path: 'test-results/management-desktop.png', fullPage: true })
  await page.close()

  // With motion, the current runs along the structure and the cards rise in once scrolled to.
  const motion = await open()
  assert.notEqual(await motion.locator('figure:has(ul[aria-label="Leadership structure"]) svg path').nth(1).evaluate(p => getComputedStyle(p).animationName), 'none', 'The current flows along the structure')
  await motion.locator('#leadership').scrollIntoViewIfNeeded()
  await motion.waitForFunction(() => [...document.querySelectorAll('#leadership [data-reveal]')].every(el => el.dataset.reveal !== 'waiting'))
  await motion.close()

  const phone = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No sideways scroll on a phone')
  const overlap = await phone.evaluate(() => {
    const boxes = [...document.querySelectorAll('ul[aria-label="Leadership structure"] > li')].map(li => li.getBoundingClientRect())
    return boxes.some((a, i) => boxes.some((b, j) => i < j && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom))
  })
  assert.equal(overlap, false, 'Structure boxes never overlap on a phone')
  assert.ok(await phone.evaluate(() => {
    const hero = document.querySelector('[data-management] > header').getBoundingClientRect()
    return [...document.querySelectorAll('ul[aria-label="Leadership structure"] > li')].every(li => li.getBoundingClientRect().bottom <= hero.bottom - 8)
  }), 'Every structure box sits inside the header on a phone')
  await phone.screenshot({ path: 'test-results/management-phone.png', fullPage: true })
  await phone.close()

  assert.deepEqual(errors, [], 'No page errors')
  console.log('Management: structure, leader cards, contacts and landline, motion, phone layout and accessibility passed.')
} finally { await browser.close() }
