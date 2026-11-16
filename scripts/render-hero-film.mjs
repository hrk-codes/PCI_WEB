// Renders the homepage hero film from the /hero-film/ stage and encodes it.
// Needs the site running (pnpm dev) at PCI_BROWSER_URL, default http://127.0.0.1:3000.
// Landscape is mastered at 3840 × 2160 (4K) and the 1920 × 1080 web version is encoded from the same frames; the
// phone version is 1080 × 1350. Each frame averages three moments across a 180° shutter (real motion blur); the
// phone frames are also drawn at 1.5× and scaled down for clean thin wires.
// Usage: node scripts/render-hero-film.mjs [--layout=landscape|portrait] [--preview|--web]
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
// --preview renders the 1920 × 1080 landscape film only, one pass per frame (no 4K), for checking it on the site.
const preview = process.argv.includes('--preview')
// Native web delivery without the expensive 4K master / temporal supersampling pass.
const web = preview || process.argv.includes('--web')
// Work files carry this run's process id, so two renders running at once (say a preview beside the full render)
// never write into each other's files; each swaps its finished files in when done.
const part = `.part-${process.pid}`
const fps = 30, seconds = 24, offset = .4, frames = fps * seconds, subframes = web ? 1 : 3, shutter = .5
const formats = [
  {name:'landscape', width:web ? 1920 : 3840, height:web ? 1080 : 2160, supersample:1, outputs:[
    ...(web ? [] : [{suffix:'-4k', width:3840, height:2160, crf264:23, crf9:34, poster:false}]),
    {suffix:'', width:1920, height:1080, crf264:23, crf9:33, poster:true},
  ]},
  {name:'portrait', width:1080, height:1350, supersample:web ? 1 : 1.5, outputs:[{suffix:'', width:1080, height:1350, crf264:24, crf9:33, poster:true}]},
].filter(format => !preview || format.name === 'landscape')
const layout = process.argv.find(arg => arg.startsWith('--layout='))?.split('=')[1]
const selected = formats.filter(format => !layout || format.name === layout)
if (!selected.length) throw new Error('Use --layout=landscape or --layout=portrait')

function encoder(base, output) {
  const child = spawn(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', 'pipe:0', '-an',
    '-c:v', 'libx264', '-threads', '2', '-preset', 'slow', '-crf', String(output.crf264), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}${part}.mp4`,
    '-c:v', 'libvpx-vp9', '-threads', '2', '-b:v', '0', '-crf', String(output.crf9), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', `${base}${part}.webm`,
  ], {cwd:root, stdio:['pipe', 'ignore', 'pipe']})
  let error = ''
  child.stderr.on('data', chunk => { error = (error + chunk).slice(-8000) })
  const done = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(`Encoding ${base} failed (${code}): ${error}`))) })
  return {child, done, base, output}
}

async function encode(page, format, base) {
  const encoders = format.outputs.map(output => encoder(base + output.suffix, output))
  for (let frame = 0; frame < frames; frame++) {
    let sum = null
    for (let k = 0; k < subframes; k++) {
      const t = (offset + (frame + (k / subframes - .5) * shutter) / fps + seconds) % seconds
      await page.evaluate(async t => { window.__pciRenderFrame(t); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))) }, t)
      const {data} = await sharp(await page.screenshot({type:'png'})).resize(format.width, format.height, {kernel:'lanczos3'}).removeAlpha().raw().toBuffer({resolveWithObject:true})
      if (!sum) sum = new Uint16Array(data.length)
      for (let i = 0; i < data.length; i++) sum[i] += data[i]
    }
    const pixels = Buffer.alloc(sum.length)
    for (let i = 0; i < sum.length; i++) pixels[i] = Math.round(sum[i] / subframes)
    const master = sharp(pixels, {raw:{width:format.width, height:format.height, channels:3}})
    for (const e of encoders) {
      const sized = e.output.width === format.width ? master.clone() : master.clone().resize(e.output.width, e.output.height, {kernel:'lanczos3'})
      const image = await sized.png({compressionLevel:1}).toBuffer()
      if (frame === 0 && e.output.poster) await sharp(image).webp({quality:86, effort:5}).toFile(`${e.base}${part}.webp`)
      if (!e.child.stdin.write(image)) await new Promise(resolve => e.child.stdin.once('drain', resolve))
    }
    if ((frame + 1) % 30 === 0) console.log(`${format.name}: ${frame + 1}/${frames}`)
  }
  for (const e of encoders) e.child.stdin.end()
  await Promise.all(encoders.map(e => e.done))
  for (const e of encoders) for (const ext of ['.mp4', '.webm', '.webp']) {
    if (ext === '.webp' && !e.output.poster) continue
    await rm(e.base + ext, {force:true}); await rename(`${e.base}${part}${ext}`, e.base + ext)
  }
}

const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args:['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11']})
try {
  for (const format of selected) {
    const page = await browser.newPage({viewport:{width:Math.round(format.width * format.supersample), height:Math.round(format.height * format.supersample)}, deviceScaleFactor:1})
    await page.goto(`${url}/hero-film/?render=1`, {waitUntil:'networkidle'})
    await page.locator('canvas[data-ready=yes]').waitFor({timeout:60000})
    const base = path.join(output, `pci-hero-film-${format.name}`)
    await encode(page, format, base)
    await page.close()
    for (const output of format.outputs) for (const ext of ['.webp', '.mp4', '.webm']) {
      if (ext === '.webp' && !output.poster) continue
      console.log(`${path.basename(base + output.suffix + ext)}: ${((await stat(base + output.suffix + ext)).size / 1024).toFixed(0)} KB`)
    }
  }
} finally { await browser.close() }
