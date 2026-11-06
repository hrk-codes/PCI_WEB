import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'
import { chromium } from 'playwright-core'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'public', 'media')
const fps = 30
const seconds = 8
const frames = fps * seconds
const formats = [
  { name: 'landscape', width: 1920, height: 1080 },
  { name: 'portrait', width: 1080, height: 1920 },
]
const args = process.argv.slice(2)
const brandOnly = args.includes('--brand-only')
const selected = formats.filter(format => !args.some(arg => arg.startsWith('--layout=')) || args.includes(`--layout=${format.name}`))
if (!selected.length) throw new Error('Use --layout=landscape or --layout=portrait')
if (!ffmpegPath) throw new Error('ffmpeg-static did not install its binary. Run pnpm install with ffmpeg-static builds allowed.')

const temporary = await mkdtemp(path.join(os.tmpdir(), 'pci-cable-'))
let server
let browser

function runFfmpeg(parameters, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...parameters], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] })
    let error = ''
    child.stderr.on('data', chunk => { error += chunk.toString(); if (error.length > 12000) error = error.slice(-12000) })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${label} failed (${code}): ${error}`)))
  })
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 90; attempt++) {
    try { const response = await fetch(`${url}/animation-preview/`); if (response.ok) return } catch { /* still starting */ }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  throw new Error(`Preview server did not start at ${url}`)
}

async function serverAvailable(url) {
  try { return (await fetch(`${url}/animation-preview/`)).ok } catch { return false }
}

async function writeFrames(page, format, mp4, webm) {
  const child = spawn(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', 'pipe:0', '-an',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4,
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '31', '-row-mt', '1', '-pix_fmt', 'yuv420p', webm,
  ], { cwd: root, stdio: ['pipe', 'ignore', 'pipe'] })
  let error = ''
  child.stderr.on('data', chunk => { error += chunk.toString(); if (error.length > 12000) error = error.slice(-12000) })
  const complete = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`Encoding ${format.name} failed (${code}): ${error}`)))
  })
  for (let frame = 0; frame < frames; frame++) {
    await page.evaluate(time => window.__pciRenderFrame(time), frame / fps)
    const image = await page.screenshot({ type: 'png', animations: 'disabled' })
    if (!child.stdin.write(image)) await new Promise(resolve => child.stdin.once('drain', resolve))
    if ((frame + 1) % 60 === 0) console.log(`${format.name}: ${frame + 1}/${frames} frames`)
  }
  child.stdin.end()
  await complete
}

try {
  await mkdir(output, { recursive: true })
  const existing = 'http://127.0.0.1:3000'
  const url = process.env.PCI_BROWSER_URL?.replace(/\/$/, '') || (await serverAvailable(existing) ? existing : 'http://127.0.0.1:3210')
  if (!process.env.PCI_BROWSER_URL && url !== existing) {
    server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '-H', '127.0.0.1', '-p', '3210'], { cwd: root, stdio: 'ignore' })
    server.on('error', error => { throw error })
  }
  await waitForServer(url)
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-webgl', '--use-angle=swiftshader'] })
  for (const format of selected) {
    const page = await browser.newPage({ viewport: { width: format.width, height: format.height }, deviceScaleFactor: 1 })
    const base = path.join(output, `pci-aluminium-cable-${format.name}`)
    if (!brandOnly) {
      await page.goto(`${url}/animation-preview/?render=1&layout=${format.name}&branding=0`, { waitUntil: 'networkidle' })
      await page.locator('.pci-cable-studio[data-ready=yes]').waitFor({ timeout: 30000 })
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => window.__pciRenderFrame(0))
      const posterImage = await page.screenshot({ type: 'png' })
      await sharp(posterImage).webp({ quality: 84, effort: 5 }).toFile(`${base}.webp`)
      await writeFrames(page, format, `${base}-clean.mp4`, `${base}-clean.webm`)
    }
    await page.goto(`${url}/animation-preview/?render=1&layout=${format.name}&branding=1`, { waitUntil: 'networkidle' })
    await page.locator('.pci-cable-studio[data-ready=yes]').waitFor({ timeout: 30000 })
    await page.evaluate(() => document.fonts.ready)
    await page.addStyleTag({ content: 'html,body,.pci-export,.pci-cable-studio{background:transparent!important}.pci-cable-studio canvas,.pci-studio-orbit,.pci-studio-light,.pci-studio-coordinate{visibility:hidden!important}.pci-cable-studio:before{display:none!important}' })
    const overlay = path.join(temporary, `brand-${format.name}.png`)
    await writeFile(overlay, await page.locator('.pci-animation-brand').screenshot({ type: 'png', omitBackground: true }))
    const alpha = (await sharp(overlay).stats()).channels[3]
    if (!alpha || alpha.min !== 0) throw new Error(`Brand overlay for ${format.name} is not transparent`)
    await runFfmpeg([
      '-i', `${base}-clean.mp4`, '-loop', '1', '-framerate', String(fps), '-i', overlay,
      '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto,split=2[mp4][webm]',
      '-map', '[mp4]', '-t', String(seconds), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}-branded.mp4`,
      '-map', '[webm]', '-t', String(seconds), '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '31', '-row-mt', '1', '-pix_fmt', 'yuv420p', `${base}-branded.webm`,
    ], `Branding ${format.name}`)
    await page.close()
    for (const suffix of ['.webp', '-clean.mp4', '-clean.webm', '-branded.mp4', '-branded.webm']) {
      const file = `${base}${suffix}`
      console.log(`${path.basename(file)} ${(await stat(file)).size.toLocaleString()} bytes`)
    }
  }
} finally {
  await browser?.close()
  server?.kill()
  await rm(temporary, { recursive: true, force: true })
}
