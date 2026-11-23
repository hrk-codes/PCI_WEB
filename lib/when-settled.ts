/**
 * Runs `task` once the page has finished loading and the browser is idle, so decorative 3D scenes never compete with
 * the first paint, the hero film or the first tap. Their static artwork stays on screen until then. Returns a cancel
 * function.
 */
export function whenSettled(task: () => void, timeout = 1200) {
  let idle = 0, timer = 0
  const go = () => {
    if (typeof requestIdleCallback === 'function') idle = requestIdleCallback(task, {timeout})
    else timer = setTimeout(task, 200) as unknown as number
  }
  if (document.readyState === 'complete') go()
  else addEventListener('load', go, {once:true})
  return () => { removeEventListener('load', go); if (idle) cancelIdleCallback(idle); clearTimeout(timer) }
}

/**
 * Runs `task` at a quiet moment: once scrolling has rested for `quiet` ms and the browser is idle. If `urgent` is
 * given and starts returning true (the scene is about to be seen), the task runs straight away instead. Heavy set-up
 * (parsing map data, building geometry) then lands between scrolls rather than in the middle of one.
 * Returns a cancel function.
 */
export function whenScrollRests(task: () => void, urgent?: () => boolean, quiet = 280) {
  let timer = 0, idle = 0, done = false
  const run = () => { if (done) return; done = true; stop(); task() }
  const arm = () => {
    clearTimeout(timer); if (idle) { cancelIdleCallback(idle); idle = 0 }
    if (urgent?.()) return run()
    timer = setTimeout(() => {
      if (typeof requestIdleCallback === 'function') idle = requestIdleCallback(run, {timeout: 400})
      else run()
    }, quiet) as unknown as number
  }
  const stop = () => { removeEventListener('scroll', arm); clearTimeout(timer); if (idle) cancelIdleCallback(idle) }
  addEventListener('scroll', arm, {passive: true})
  arm()
  return () => { done = true; stop() }
}
