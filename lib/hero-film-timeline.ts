/** Timing for the homepage hero film. Shared by the 3D render scene and the hero captions (no three.js here). */
export const HERO_FILM_SECONDS = 18
/** The encoded video starts just after the loop-point dip, so its first frame (and the poster) is the golden-hour line. */
export const HERO_FILM_OFFSET = .4

export const heroChapters = [
  {key:'conductors', label:'Conductors', href:'/conductors/', start:0, end:4},
  {key:'cables', label:'Cables', href:'/cables/', start:4, end:8},
  {key:'earth-wire', label:'Earth wire', href:'/earth-wire/', start:8, end:12},
] as const

export type HeroChapterKey = typeof heroChapters[number]['key']

/** Chapter for a playback position of the encoded video (seconds since its first frame). */
export function chapterAtTime(videoSeconds: number) {
  const t = (((videoSeconds + HERO_FILM_OFFSET) % HERO_FILM_SECONDS) + HERO_FILM_SECONDS) % HERO_FILM_SECONDS
  const chapter = heroChapters.find(c => t >= c.start && t < c.end) ?? heroChapters[0]
  return {chapter, progress:(t - chapter.start) / (chapter.end - chapter.start)}
}
