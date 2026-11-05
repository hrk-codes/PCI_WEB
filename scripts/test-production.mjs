import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'
const base = 'http://127.0.0.1:3100'
await mkdir('.data', { recursive:true })
const env = { ...process.env, NODE_ENV:'development', DATABASE_URL:'', RESEND_API_KEY:'', SITE_INDEXABLE:'false', BLOCK_PUBLIC_ADMIN_SETUP:'false',
  PAYLOAD_SECRET:randomBytes(48).toString('hex'), SQLITE_URL:'file:.data/qa-'+randomBytes(6).toString('hex')+'.sqlite',
  NEXT_PUBLIC_SITE_URL:base, PCI_SMOKE_URL:base, PCI_SMOKE_WRITE:'1', PCI_BROWSER_URL:base }
function run(script, args = [], overrides = {}) {
  return spawn(process.execPath, [script, ...args], { env:{ ...env, ...overrides }, stdio:'inherit', windowsHide:true })
}
const wait = (child) => new Promise((resolve,reject) => {
  child.on('error',reject)
  child.on('exit',(code)=>code===0?resolve():reject(new Error('Command exited with '+code)))
})
await wait(run('scripts/seed.mjs'))
const server = run('node_modules/next/dist/bin/next',['start','-H','127.0.0.1','-p','3100'],{ NODE_ENV:'production' })
try {
  let ready = false
  for (let i=0;i<45;i++) {
    try { ready = (await fetch(base, { signal:AbortSignal.timeout(3000) })).ok } catch {}
    if (ready) break
    if (server.exitCode!==null) break
    await setTimeout(650)
  }
  if (!ready) throw new Error('Production server did not become ready.')
  await wait(run('scripts/smoke.mjs'))
  if (process.env.PCI_SKIP_BROWSER !== '1') {
    await wait(run('scripts/test-browser.mjs'))
    await wait(run('scripts/test-earth.mjs'))
  }
} finally { server.kill() }
