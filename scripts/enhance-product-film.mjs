// Turns the approved aluminium cable film into a sharper, smoother, transparent web film.
// 1. Motion-interpolates 25 → 50 fps and upscales 1280×720 → 1920×1080 (lanczos, light denoise and sharpen).
// 2. Lifts the cable off its slate studio room with a chroma matte and removes backdrop spill from the edges.
// 3. Composites the cable over the section's carbon tone with a soft studio glow baked in, then writes an MP4 (H.264,
//    which plays and seeks well everywhere) with dense keyframes for scroll scrubbing, plus transparent WebP posters.
// Usage: node scripts/enhance-product-film.mjs [source.mp4]   (default: the approved aluminium edit)
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { rename, rm, stat } from 'node:fs/promises'
import ffmpeg from 'ffmpeg-static'
import sharp from 'sharp'

const source = process.argv[2] || 'public/media/pci-reference-aluminum-clean.mp4'
const base = 'public/media/pci-cable-film'
const W = 1920, H = 1080, FPS = 50
const frameBytes = W * H * 3
const posterTimes = {final: 5.6, start: 0}
const backdrop = 'public/media/.pci-cable-film-backdrop.png'

function run(args, input = false) {
  const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {stdio:[input ? 'pipe' : 'ignore', 'pipe', 'pipe']})
  let log = ''
  child.stderr.on('data', d => { log = (log + d).slice(-8000) })
  child.done = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', code => code ? reject(new Error(log)) : resolve()) })
  return child
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
/** Slate backdrop: blue minus red ≈ 44, green minus red ≈ 23. Metals and jackets sit far from that signature. */
function matte(rgb, rgba) {
  for (let i = 0, n = W * H; i < n; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]
    const dist = Math.hypot(b - r - 44, (g - r - 23) * 1.4)
    let a = smooth(9, 24, dist)
    if (r + g + b > 495) a = 1
    // Snap the matte so empty backdrop costs no bits.
    if (a < .04) a = 0; else if (a > .96) a = 1
    if (a === 0) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = rgba[i * 4 + 3] = 0; continue }
    const k = 1 - a, inv = a > .02 ? 1 / a : 0
    rgba[i * 4] = Math.min(255, Math.max(0, (r - 84 * k) * inv))
    rgba[i * 4 + 1] = Math.min(255, Math.max(0, (g - 106 * k) * inv))
    rgba[i * 4 + 2] = Math.min(255, Math.max(0, (b - 128 * k) * inv))
    rgba[i * 4 + 3] = Math.round(a * 255)
  }
}

// Backdrop: carbon (#15181c, the section colour) with a cool glow and a faint warm floor light.
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><radialGradient id="c" cx="54%" cy="50%" r="58%"><stop offset="0" stop-color="#2c3b48"/><stop offset=".45" stop-color="#1d252e"/><stop offset="1" stop-color="#15181c"/></radialGradient><radialGradient id="w" cx="56%" cy="72%" r="34%"><stop offset="0" stop-color="#ff7444" stop-opacity=".14"/><stop offset="1" stop-color="#ff7444" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#c)"/><rect width="100%" height="100%" fill="url(#w)"/></svg>`)).png().toFile(backdrop)

const decode = run(['-i', source, '-an', '-vf',
  `minterpolate=fps=${FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,scale=${W}:${H}:flags=lanczos,hqdn3d=1.5:1.5:3:3,unsharp=5:5:0.5:5:5:0`,
  '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'])
const encode = run(['-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${W}x${H}`, '-framerate', String(FPS), '-i', 'pipe:0', '-loop', '1', '-framerate', String(FPS), '-i', backdrop,
  '-filter_complex', '[1:v][0:v]overlay=shortest=1:format=auto,format=yuv420p[b]',
  '-map', '[b]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-g', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.part.mp4`], true)

const rgba = Buffer.alloc(W * H * 4)
let pending = Buffer.alloc(0), frame = 0
for await (const chunk of decode.stdout) {
  pending = Buffer.concat([pending, chunk])
  while (pending.length >= frameBytes) {
    const rgb = pending.subarray(0, frameBytes)
    matte(rgb, rgba)
    pending = Buffer.from(pending.subarray(frameBytes))
    const seconds = frame / FPS
    for (const [name, t] of Object.entries(posterTimes)) if (Math.abs(seconds - t) < .5 / FPS) await sharp(Buffer.from(rgba), {raw:{width:W, height:H, channels:4}}).webp({quality:86, alphaQuality:92, effort:5}).toFile(`${base}-${name}.part.webp`)
    if (!encode.stdin.write(Buffer.from(rgba))) await once(encode.stdin, 'drain')
    if (++frame % 100 === 0) console.log(`${frame} frames`)
  }
}
encode.stdin.end()
await Promise.all([decode.done, encode.done])
await rm(backdrop, {force:true})
for (const file of [`${base}.mp4`, `${base}-final.webp`, `${base}-start.webp`]) {
  const part = file.replace(/(\.\w+)$/, '.part$1')
  await rm(file, {force:true}); await rename(part, file)
  console.log(`${file}: ${((await stat(file)).size / 1024).toFixed(0)} KB`)
}
console.log(`${frame} frames at ${FPS} fps`)
