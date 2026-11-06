import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, rm, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import ffmpeg from 'ffmpeg-static'
import sharp from 'sharp'
import { aluminumColor } from './aluminum-color.mjs'

const source = process.argv[2] || 'C:/Users/HRITHIK/Downloads/video6300603795009184191.mp4'
const base = 'public/media/pci-reference-aluminum'
const frameBytes = 1280 * 720 * 3
const temp = await mkdtemp(path.join(os.tmpdir(), 'pci-reference-'))
await mkdir('public/media', { recursive: true })
function processVideo(args, input = false) {
  const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] })
  let log = ''
  child.stderr.on('data', data => { log += data })
  child.done = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', code => code ? reject(new Error(log)) : resolve()) })
  return child
}
try {
  const decode = processVideo(['-i', source, '-an', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'])
  const encode = processVideo(['-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', '1280x720', '-framerate', '25', '-i', 'pipe:0', '-an',
    '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}-clean.mp4`,
    '-an', '-c:v', 'libvpx-vp9', '-crf', '26', '-b:v', '0', '-row-mt', '1', '-pix_fmt', 'yuv420p', `${base}-clean.webm`], true)
  let pending = Buffer.alloc(0), frames = 0
  for await (const chunk of decode.stdout) {
    pending = Buffer.concat([pending, chunk])
    while (pending.length >= frameBytes) {
      const frame = Buffer.from(pending.subarray(0, frameBytes))
      pending = pending.subarray(frameBytes)
      aluminumColor(frame)
      if (frames === 125) await sharp(frame, { raw: { width: 1280, height: 720, channels: 3 } }).webp({ quality: 90 }).toFile(`${base}.webp`)
      if (!encode.stdin.write(frame)) await once(encode.stdin, 'drain')
      frames++
      if (frames % 50 === 0) console.log(`Corrected ${frames} frames`)
    }
  }
  encode.stdin.end()
  await Promise.all([decode.done, encode.done])
  const logo = (await readFile('public/media/logo.webp')).toString('base64')
  const overlay = path.join(temp, 'branding.png')
  await sharp(Buffer.from(`<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg"><image href="data:image/webp;base64,${logo}" x="30" y="25" width="100" height="65"/><text x="30" y="685" font-family="Arial" font-size="20" font-weight="bold" fill="white">PCI Cables · Aluminum cores</text></svg>`)).png().toFile(overlay)
  const branded = processVideo(['-i', `${base}-clean.mp4`, '-loop', '1', '-framerate', '25', '-i', overlay,
    '-filter_complex', '[0:v][1:v]overlay=0:0:shortest=1,split=2[m][w]',
    '-map', '[m]', '-an', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}-branded.mp4`,
    '-map', '[w]', '-an', '-c:v', 'libvpx-vp9', '-crf', '26', '-b:v', '0', '-row-mt', '1', '-pix_fmt', 'yuv420p', `${base}-branded.webm`])
  await branded.done
  console.log(`Completed ${frames} frames at 25 fps. Original composition and timing preserved; no audio.`)
} finally { await rm(temp, { recursive: true, force: true }) }
