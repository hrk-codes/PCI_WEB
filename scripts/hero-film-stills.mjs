// Quick review stills of the hero film from the /hero-film/ stage, without encoding a video.
// Usage: node scripts/hero-film-stills.mjs [t1 t2 ...] [--size=1280x720]   → test-results/hero-still-<t>.png and a contact sheet
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'
import { chromium } from 'playwright-core'
const url = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const sizeArg = process.argv.find(a => a.startsWith('--size='))?.split('=')[1] ?? '1280x720'
const [width, height] = sizeArg.split('x').map(Number)
const times = process.argv.slice(2).filter(a => !a.startsWith('--')).map(Number)
const list = times.length ? times : [.8, 2.2, 3.6, 4.8, 6.2, 7.6, 8.8, 10.2, 11.6, 12.8, 14.2, 15.6, 16.8, 18.2, 19.6, 20.8, 22.2, 23.4]
await mkdir('test-results', {recursive:true})
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args:['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11']})
const page = await browser.newPage({viewport:{width, height}})
const errors = []
page.on('pageerror', e => errors.push(e.message))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
await page.goto(`${url}/hero-film/?render=1`, {waitUntil:'networkidle'})
await page.locator('canvas[data-ready=yes]').waitFor({timeout:120000})
const tiles = []
for (const t of list) {
  await page.evaluate(async t => { window.__pciRenderFrame(t); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))) }, t)
  const shot = await page.screenshot({type:'png'})
  await sharp(shot).toFile(`test-results/hero-still-${t.toFixed(1)}.png`)
  tiles.push(await sharp(shot).resize(480, Math.round(480 * height / width)).png().toBuffer())
}
const th = Math.round(480 * height / width), cols = 3, rows = Math.ceil(tiles.length / cols)
await sharp({create:{width:cols * 484, height:rows * (th + 4), channels:3, background:'#000'}})
  .composite(tiles.map((input, i) => ({input, left:(i % cols) * 484, top:Math.floor(i / cols) * (th + 4)}))).png().toFile('test-results/hero-stills.png')
await browser.close()
if (errors.length) console.log('Page errors:\n' + errors.join('\n'))
console.log(`${list.length} stills → test-results/hero-stills.png`)
