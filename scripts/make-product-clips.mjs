// Turns the phone videos of PCI's display samples (htdocs/product_details/) into polished product-page loops.
// Per clip: two-pass stabilisation, 30 fps, 864×1536 portrait, light denoise + sharpen, gentle grade and vignette,
// then forward + reversed playback for a seamless loop. Writes public/media/samples/<slug>.mp4 and a WebP poster.
// Usage: node scripts/make-product-clips.mjs [slug ...]   (default: every clip)
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import ffmpeg from 'ffmpeg-static'

const source = process.env.PCI_SAMPLE_DIR || 'D:/Hrithik_pci/htdocs/product_details'
const out = path.resolve('public/media/samples')
// start/seconds pick the steadiest stretch of each phone clip.
const clips = [
  {slug:'acsr', file:'VID20261112142721.mp4', start:2.5, seconds:4},
  {slug:'lt-xlpe-cable', file:'VID20261112142952.mp4', start:1.0, seconds:4},
  {slug:'aerial-bunched-cable', file:'VID20261112143153.mp4', start:.4, seconds:3.4},
  {slug:'covered-conductor', file:'VID20261112143235.mp4', start:.6, seconds:4},
  {slug:'control-cable', file:'VID20261112143354.mp4', start:.8, seconds:4},
  {slug:'aac', file:'VID20261112143418.mp4', start:1.2, seconds:4},
  {slug:'eco-panther', file:'VID20261112143510.mp4', start:1.0, seconds:4},
  {slug:'gi-earth-wire', file:'VID20261112143540.mp4', start:1.0, seconds:4},
  {slug:'pvc-power-cable', file:'VID20261112143736.mp4', start:.8, seconds:4},
]
const only = process.argv.slice(2)

function run(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {cwd, stdio:['ignore', 'ignore', 'pipe']})
    let log = ''
    child.stderr.on('data', d => { log = (log + d).slice(-6000) })
    child.on('error', reject)
    child.on('close', code => code ? reject(new Error(log)) : resolve())
  })
}

await mkdir(out, {recursive:true})
const work = await mkdtemp(path.join(os.tmpdir(), 'pci-samples-'))
try {
  for (const clip of clips.filter(c => !only.length || only.includes(c.slug))) {
    const input = path.join(source, clip.file), trim = ['-ss', String(clip.start), '-t', String(clip.seconds), '-i', input]
    // Pass 1: measure the handheld motion (relative file names keep Windows paths out of the filter string).
    await run([...trim, '-vf', 'vidstabdetect=shakiness=6:accuracy=15:result=motion.trf', '-f', 'null', '-'], work)
    const grade = [
      'vidstabtransform=input=motion.trf:smoothing=40:zoom=5:optzoom=0',
      'fps=30', 'scale=864:1536:flags=lanczos', 'hqdn3d=1.2:1.2:4:4', 'unsharp=5:5:.55:5:5:0',
      'eq=contrast=1.06:brightness=.01:saturation=1.06:gamma=.98', 'vignette=angle=PI/4.6:mode=forward',
    ].join(',')
    const target = path.join(out, `${clip.slug}.part.mp4`)
    await run([...trim, '-filter_complex', `[0:v]${grade},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]`, '-map', '[v]', '-an',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target], work)
    const poster = path.join(out, `${clip.slug}.part.webp`)
    await run(['-ss', String(clip.seconds * .5), '-i', target, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '86', poster], work)
    for (const [part, final] of [[target, path.join(out, `${clip.slug}.mp4`)], [poster, path.join(out, `${clip.slug}.webp`)]]) { await rm(final, {force:true}); await rename(part, final) }
    console.log(`${clip.slug}: ${((await stat(path.join(out, `${clip.slug}.mp4`))).size / 1024 / 1024).toFixed(1)} MB`)
  }
} finally { await rm(work, {recursive:true, force:true}) }
