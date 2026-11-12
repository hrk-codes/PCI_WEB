// Renders the homepage hero film from the /hero-film/ stage and encodes it.
// Needs the site running (pnpm dev) at PCI_BROWSER_URL, default http://127.0.0.1:3000.
// Usage: node scripts/render-hero-film.mjs [--layout=landscape|portrait]
import { spawn } from 'node:child_process'
import { rename, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'public', 'media')
const url = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const fps = 30, seconds = 12, offset = 8.5, frames = fps * seconds
const formats = [
  {name:'landscape', width:1920, height:1080, crf264:22, crf9:31},
  {name:'portrait', width:1080, height:1350, crf264:22, crf9:31},
]
const layout = process.argv.find(arg => arg.startsWith('--layout='))?.split('=')[1]
const selected = formats.filter(format => !layout || format.name === layout)
if (!selected.length) throw new Error('Use --layout=landscape or --layout=portrait')

async function encode(page, format, base) {
  const child = spawn(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', 'pipe:0', '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(format.crf264), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.part.mp4`,
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(format.crf9), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', `${base}.part.webm`,
  ], {cwd:root, stdio:['pipe', 'ignore', 'pipe']})
  let error = ''
  child.stderr.on('data', chunk => { error = (error + chunk).slice(-8000) })
  const done = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(`Encoding ${format.name} failed (${code}): ${error}`))) })
  for (let frame = 0; frame < frames; frame++) {
    await page.evaluate(async t => { window.__pciRenderFrame(t); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))) }, (offset + frame / fps) % seconds)
    const image = await page.screenshot({type:'png'})
    if (frame === 0) await sharp(image).webp({quality:86, effort:5}).toFile(`${base}.part.webp`)
    if (!child.stdin.write(image)) await new Promise(resolve => child.stdin.once('drain', resolve))
    if ((frame + 1) % 60 === 0) console.log(`${format.name}: ${frame + 1}/${frames}`)
  }
  child.stdin.end()
  await done
  for (const ext of ['.mp4', '.webm', '.webp']) { await rm(base + ext, {force:true}); await rename(`${base}.part${ext}`, base + ext) }
}

const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args:['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11']})
try {
  for (const format of selected) {
    const page = await browser.newPage({viewport:{width:format.width, height:format.height}, deviceScaleFactor:1})
    await page.goto(`${url}/hero-film/?render=1`, {waitUntil:'networkidle'})
    await page.locator('canvas[data-ready=yes]').waitFor({timeout:60000})
    const base = path.join(output, `pci-hero-film-${format.name}`)
    await encode(page, format, base)
    await page.close()
    for (const ext of ['.webp', '.mp4', '.webm']) console.log(`${path.basename(base + ext)}: ${((await stat(base + ext)).size / 1024).toFixed(0)} KB`)
  }
} finally { await browser.close() }
