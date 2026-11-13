import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { createPowerCoreGeometry, powerCoreProfile, powerCoreStrands } from '../lib/power-cable-cores.ts'

// Check the actual profiles and strand positions: a screenshot alone cannot detect buried intersections.
for (const [count, radius] of [[2, .565], [4, .587]]) {
  const strand = .026, metalRadius = radius - .052, inset = .064
  const points = powerCoreStrands(count, metalRadius, inset, strand)
  assert.ok(points.length > 50)
  for (const [index, [x, z]] of points.entries()) {
    assert.ok(Math.hypot(x, z) + strand <= metalRadius + 1e-9)
    assert.ok(x - strand >= inset && (count === 2 || z - strand >= inset))
    for (const [otherX, otherZ] of points.slice(index + 1)) {
      assert.ok(Math.hypot(x - otherX, z - otherZ) >= strand * 2, 'Metal strands must not intersect')
    }
  }
  const profile = powerCoreProfile(count, radius).getPoints(256)
  const area = Math.abs(profile.reduce((sum, point, index) => {
    const next = profile[(index + 1) % profile.length]
    return sum + point.x * next.y - next.x * point.y
  }, 0)) / 2
  assert.ok(area * count / (Math.PI * radius ** 2) > .96, 'Packed cores fill the circular envelope')
  const geometry = createPowerCoreGeometry(count, radius, .3, 2.5)
  geometry.computeBoundingBox()
  assert.ok(Math.abs(geometry.boundingBox.min.y - .3) < 1e-6)
  assert.ok(Math.abs(geometry.boundingBox.max.y - 2.5) < 1e-6)
  assert.ok([...geometry.attributes.position.array].every(Number.isFinite))
  geometry.dispose()
}

const base = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const errors = []
await mkdir('test-results', { recursive: true })
try {
  for (const slug of ['pvc-power-cable', 'lt-xlpe-cable']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/products/${slug}/`, { waitUntil: 'domcontentloaded' })
    const viewer = page.locator('[data-product-viewer]')
    const canvas = viewer.locator('canvas[data-ready=yes]')
    await canvas.waitFor()
    const initial = await canvas.screenshot()
    await viewer.screenshot({ path: `test-results/${slug}-packed.png` })
    await page.getByRole('button', { name: 'End view', exact: true }).click()
    await page.waitForTimeout(150)
    assert.equal(initial.equals(await canvas.screenshot()), false, 'Axial projection changes the view')
    assert.equal(await page.getByLabel('Zoom', { exact: true }).inputValue(), '1', 'End view fits without accidental doubling')
    await viewer.screenshot({ path: `test-results/${slug}-packed-end.png` })
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await page.waitForTimeout(150)
    assert.ok(initial.equals(await canvas.screenshot()), 'Reset restores perspective and the original fit')
    await page.getByLabel('Separate layers', { exact: true }).focus()
    await page.keyboard.press('End')
    await page.waitForTimeout(150)
    assert.equal(initial.equals(await canvas.screenshot()), false)
    await viewer.screenshot({ path: `test-results/${slug}-packed-layers.png` })
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await page.waitForTimeout(150)
    assert.ok(initial.equals(await canvas.screenshot()), 'Cutaway sections reassemble without drift')
    await page.getByRole('group', { name: /3D construction/ }).focus()
    await page.keyboard.press('Home')
    await page.waitForTimeout(150)
    const focused = await canvas.screenshot()
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(150)
    assert.equal(focused.equals(await canvas.screenshot()), false, 'Keyboard rotation works')
    await page.keyboard.press('Home')
    await page.waitForTimeout(150)
    const resetImage = await canvas.screenshot()
    const { width, height } = await sharp(focused).metadata()
    const crop = { left: 4, top: 4, width: width - 8, height: height - 8 }
    const before = await sharp(focused).extract(crop).raw().toBuffer()
    const after = await sharp(resetImage).extract(crop).raw().toBuffer()
    const difference = before.reduce((sum, value, index) => sum + Math.abs(value - after[index]), 0) / before.length
    assert.ok(difference < .15, `${slug}: keyboard reset restores the same geometry (mean pixel difference ${difference})`)
    await page.setViewportSize({ width: 390, height: 844 })
    await canvas.scrollIntoViewIfNeeded()
    await page.waitForTimeout(150)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await viewer.screenshot({ path: `test-results/${slug}-packed-mobile.png` })
    await page.close()
    const fallback = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
    await fallback.goto(`${base}/products/${slug}/`, { waitUntil: 'domcontentloaded' })
    const image = fallback.locator('[data-product-viewer] img').first()
    assert.ok((await image.getAttribute('src')).includes(`${slug}-sector`), 'Fallback uses the new sector model, not the old round cores')
    assert.ok(await image.evaluate(async image => { await image.decode(); return image.naturalWidth > 0 }))
    await fallback.close()
  }
  assert.deepEqual(errors, [])
  console.log('Sector packing, strand clearance, fitted sheaths, axial views, separation/reset, keyboard, mobile and new static posters passed.')
} finally { await browser.close() }
