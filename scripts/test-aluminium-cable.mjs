import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
const url = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${url}/animation-preview/`, { waitUntil: 'domcontentloaded' })
  await page.locator('video').scrollIntoViewIfNeeded()
  await page.waitForFunction(() => document.querySelector('video')?.currentTime > .2)
  const metadata = await page.locator('video').evaluate(video => ({ duration: video.duration, width: video.videoWidth, height: video.videoHeight }))
  assert.ok(Math.abs(metadata.duration - 12.28) < .05)
  assert.equal(metadata.width, 1280)
  assert.equal(metadata.height, 720)
  await page.getByRole('button', { name: 'PCI branding', exact: true }).click()
  assert.match(await page.locator('video source').first().getAttribute('src'), /branded/)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await page.locator('video').evaluate(video => getComputedStyle(video).display), 'none')
  assert.equal(await page.locator('.pci-cable-poster').evaluate(image => image.complete && image.naturalWidth > 0), true)
  assert.deepEqual(errors, [])
  console.log('Reference film preview: playback, branding switch, mobile fit and reduced-motion poster passed. The homepage section is covered by scripts/test-product-film.mjs.')
} finally { await browser.close() }
