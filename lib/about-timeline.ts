/** Shared scroll timeline for the homepage About story (p runs 0 → 1 across the pinned section). */
export const clamp = (n: number) => Math.max(0, Math.min(1, n))
export const phase = (p: number, start: number, end: number) => {
  const t = clamp((p - start) / (end - start))
  return t * t * (3 - 2 * t)
}

export function aboutTimeline(p: number) {
  return {
    /** Beat 1: the armoured cable opens layer by layer, then closes again. */
    anatomy: phase(p, .04, .24) * (1 - phase(p, .30, .40)),
    /** Beat 2: the artwork moves from centre stage into the left column. */
    settle: phase(p, .34, .50),
    companions: phase(p, .38, .56),
    pulse: phase(p, .40, .48) * (1 - phase(p, .68, .76)),
    headlineIn: phase(p, .44, .52),
    headline: phase(p, .48, .68),
    /** Beat 3: the story and figures land. */
    copy: phase(p, .68, .80),
    stats: phase(p, .74, .92),
  }
}

export const chapterAt = (p: number) => p < .36 ? 'anatomy' : p < .68 ? 'range' : 'reach'
