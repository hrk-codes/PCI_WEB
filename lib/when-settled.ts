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
