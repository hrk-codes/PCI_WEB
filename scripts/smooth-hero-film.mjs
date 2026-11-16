// Finish the captured 30 fps hero films as 60 fps web delivery files.
// Scene-aware intermediate frames soften the camera steps while preserving the six-shot edit.
// Original-resolution frames are retained; no upscale or duplicate-frame fps conversion is used.
// Run after render-hero-film.mjs: node scripts/smooth-hero-film.mjs [landscape|portrait]
import { spawn } from 'node:child_process'
import { copyFile, rename, stat } from 'node:fs/promises'
import path from 'node:path'
import ffmpeg from 'ffmpeg-static'

const media = path.resolve('public/media')
const layouts = process.argv.slice(2).length ? process.argv.slice(2) : ['landscape', 'portrait']
if (layouts.some(layout => !['landscape', 'portrait'].includes(layout))) throw Error('Use landscape or portrait')
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ['ignore', 'inherit', 'inherit'] })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(Error(`Video finishing failed: ${code}`)))
  })
}
for (const layout of layouts) {
  const source = path.join(media, `pci-hero-film-${layout}.mp4`)
  const base = path.join(media, `pci-hero-film-${layout}-smooth`)
  const part = `${base}.part-${process.pid}`
  await stat(source)
  console.log(`Finishing ${layout} at 60 fps…`)
  await run(['-hide_banner', '-loglevel', 'warning', '-y', '-threads', '2', '-i', source, '-an',
    '-filter_threads', '2', '-vf', 'framerate=fps=60:interp_start=0:interp_end=255:scene=8:flags=scene_change_detect,tpad=stop_mode=clone:stop_duration=0.1,trim=duration=24,setpts=PTS-STARTPTS',
    '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${part}.mp4`])
  console.log(`${layout}: smoothed MP4 complete; encoding the browser WebM.`)
  await run(['-hide_banner', '-loglevel', 'warning', '-y', '-threads', '2', '-i', `${part}.mp4`, '-an',
    '-c:v', 'libvpx-vp9', '-threads', '2', '-b:v', '0', '-crf', '32', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '5', '-pix_fmt', 'yuv420p', `${part}.webm`])
  await rename(`${part}.mp4`, `${base}.mp4`)
  await rename(`${part}.webm`, `${base}.webm`)
  await copyFile(path.join(media, `pci-hero-film-${layout}.webp`), `${base}.webp`)
  console.log(`${layout}: finished MP4 and WebM at 60 fps.`)
}
