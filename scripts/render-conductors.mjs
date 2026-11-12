// Renders the six overhead conductor product images from the /conductor-render/ studio stage.
// Each conductor is rendered at 4K on a transparent background, then all six are cropped to one shared frame
// (so they match in scale and angle) and saved as polished WebP images in public/media/conductors/.
// Needs the site running (pnpm dev) at PCI_BROWSER_URL, default http://127.0.0.1:3000.
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'
import { chromium } from 'playwright-core'

const url = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const kinds = ['aac', 'aaac', 'acsr', 'aacsr', 'acar', 'eco-panther']
const W = 3840, H = 2020, OUT_W = 2400
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args:['--enable-gpu', '--ignore-gpu-blocklist']})
try {
  const page = await browser.newPage({viewport:{width:W, height:H}, deviceScaleFactor:1})
  await page.goto(`${url}/conductor-render/?kind=aac`, {waitUntil:'networkidle'})
  await page.locator('canvas[data-ready=yes]').waitFor({timeout:60000})
  const renders = []
  for (const kind of kinds) {
    const data = await page.evaluate(k => window.__pciRenderConductor(k), kind)
    renders.push({kind, png:Buffer.from(data.split(',')[1], 'base64')})
  }
  // One shared crop: the union of every conductor's visible pixels, plus breathing room.
  let box = {left:W, top:H, right:0, bottom:0}
  for (const r of renders) {
    const {data, info} = await sharp(r.png).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    for (let y = 0; y < info.height; y += 2) for (let x = 0; x < info.width; x += 2) {
      if (data[(y * info.width + x) * 4 + 3] > 8) { box.left = Math.min(box.left, x); box.right = Math.max(box.right, x); box.top = Math.min(box.top, y); box.bottom = Math.max(box.bottom, y) }
    }
  }
  const pad = Math.round((box.right - box.left) * .04)
  const crop = {left:Math.max(0, box.left - pad), top:Math.max(0, box.top - pad)}
  crop.width = Math.min(W, box.right + pad) - crop.left
  crop.height = Math.min(H, box.bottom + pad) - crop.top
  await mkdir('public/media/conductors', {recursive:true})
  for (const r of renders) {
    const file = `public/media/conductors/${r.kind}.webp`
    const info = await sharp(r.png).extract(crop).resize({width:OUT_W, kernel:'lanczos3'}).sharpen({sigma:.6, m1:.4, m2:1.2}).webp({quality:90, alphaQuality:95, effort:6, smartSubsample:true}).toFile(file)
    console.log(`${file}: ${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} KB`)
  }
} finally { await browser.close() }
