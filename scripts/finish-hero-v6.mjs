// Edit the completed native-60-fps v5 masters without rerendering unchanged scenes.
// Remove the glass-insulator close-up and replace only the existing 210-frame field shot.
// Frame boundaries include the capture's .4 s offset and quarter-frame shutter offset.
import { spawn } from 'node:child_process'
import { copyFile, rename, stat } from 'node:fs/promises'
import path from 'node:path'
import ffmpeg from 'ffmpeg-static'

const media = path.resolve('public/media')
const layouts = process.argv.slice(2).length ? process.argv.slice(2) : ['landscape', 'portrait']
if (layouts.some(layout => !['landscape', 'portrait'].includes(layout))) throw Error('Use landscape or portrait')
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, {stdio:['ignore', 'inherit', 'inherit']})
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(Error(`Hero edit failed (${code})`)))
  })
}
for (const layout of layouts) {
  const source = path.join(media, `pci-hero-film-${layout}-v5`)
  const field = path.join(media, `pci-hero-film-${layout}-v6-field.mp4`)
  const base = path.join(media, `pci-hero-film-${layout}-v6`)
  const part = `${base}.part-${process.pid}`
  await stat(`${source}.mp4`); await stat(field)
  console.log(`${layout}: editing nine scenes into 1950 native frames (32.5 seconds).`)
  const filter = '[0:v]split=3[a][b][d];' +
    '[a]trim=start_frame=0:end_frame=427,setpts=PTS-STARTPTS[a0];' +
    '[b]trim=start_frame=637:end_frame=1267,setpts=PTS-STARTPTS[b0];' +
    '[1:v]trim=start_frame=0:end_frame=210,setpts=PTS-STARTPTS[c0];' +
    '[d]trim=start_frame=1477:end_frame=2160,setpts=PTS-STARTPTS[d0];' +
    '[a0][b0][c0][d0]concat=n=4:v=1:a=0[out]'
  await run(['-hide_banner', '-loglevel', 'warning', '-y', '-threads', '2', '-i', `${source}.mp4`,
    '-threads', '2', '-i', field, '-filter_complex_threads', '2', '-filter_complex', filter,
    '-map', '[out]', '-an', '-r', '60', '-frames:v', '1950', '-c:v', 'libx264', '-threads', '2',
    '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${part}.mp4`])
  console.log(`${layout}: MP4 complete; encoding WebM.`)
  await run(['-hide_banner', '-loglevel', 'warning', '-y', '-threads', '2', '-i', `${part}.mp4`, '-an',
    '-c:v', 'libvpx-vp9', '-threads', '2', '-b:v', '0', '-crf', '33', '-row-mt', '1', '-deadline', 'good',
    '-cpu-used', '5', '-pix_fmt', 'yuv420p', `${part}.webm`])
  await rename(`${part}.mp4`, `${base}.mp4`)
  await rename(`${part}.webm`, `${base}.webm`)
  await copyFile(`${source}.webp`, `${base}.webp`)
  console.log(`${layout}: complete native-60-fps v6 release.`)
}
