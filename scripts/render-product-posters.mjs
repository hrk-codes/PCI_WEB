// Capture the manually controlled product models as high-resolution fallback artwork.
// Run against the local preview. No product video is played or downloaded.
import { mkdir, readFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import sharp from 'sharp'

const products = JSON.parse(await readFile(new URL('../content/catalogue.json', import.meta.url), 'utf8'))
const only = process.argv.slice(2)
const base = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
await mkdir('public/media/products', { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' })
  for (const product of products.filter(product => !only.length || only.includes(product.slug))) {
    const response = await page.goto(`${base}/products/${product.slug}/?poster=1`, { waitUntil: 'domcontentloaded' })
    if (response.status() !== 200) throw Error(`${product.slug} did not load`)
    const canvas = page.locator('[data-product-viewer] canvas[data-ready=yes]')
    await canvas.waitFor({ timeout: 30000 })
    // Keep the viewer's badge and controls out of the artwork.
    await page.addStyleTag({ content: '[data-product-viewer] span{visibility:hidden!important}' })
    await canvas.evaluate(element => {
      element.parentElement.style.cssText += ';position:fixed;top:0;left:0;width:1200px;height:900px;z-index:99;'
    })
    await page.waitForFunction(() => document.querySelector('[data-product-viewer] canvas').width === 1800)
    const image = await canvas.screenshot({ omitBackground: true })
    const imageName = product.slug === 'control-cable' ? 'control-cable-copper' : ['pvc-power-cable', 'lt-xlpe-cable'].includes(product.slug) ? `${product.slug}-sector` : product.slug
    await sharp(image).webp({ quality: 90, effort: 5 }).toFile(`public/media/products/${imageName}.webp`)
    console.log(`Captured ${product.slug} at 1800 × 1350`)
    if (product.slug === 'control-cable') {
      // Keep the sample's upright pose on its page, with a matching diagonal thumbnail on the span.
      await page.getByRole('group', { name: 'Control Cable 3D construction' }).focus()
      for (let turn = 0; turn < 4; turn++) await page.keyboard.press('ArrowRight')
      for (let turn = 0; turn < 5; turn++) await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(150)
      await page.addStyleTag({ content: 'html,body{background:transparent!important}body *{visibility:hidden!important}[data-product-viewer] canvas{visibility:visible!important}' })
      const transparent = await canvas.screenshot({ omitBackground: true })
      await sharp(transparent).trim().resize({ width: 2400 }).webp({ quality: 90, alphaQuality: 95 }).toFile('public/media/conductors/control-cable-copper.webp')
      console.log('Captured transparent copper control cable for the featured span')
    }
  }
} finally { await browser.close() }
