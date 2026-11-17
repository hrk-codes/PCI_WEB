import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

await mkdir('test-results', {recursive:true})
const base = process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000'
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const errors = []
async function open(options = {}) {
  const page = await browser.newPage({viewport:{width:1440,height:950}, ...options})
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(base, {waitUntil:'domcontentloaded'})
  await page.evaluate(() => document.fonts.ready)
  return page
}
const host = page => page.locator('.site-head .header-logo-canvas')
const ready = page => page.locator('.site-head .header-logo-canvas[data-ready=yes]').waitFor({timeout:30000})
try {
  const page = await open()
  await ready(page)
  await page.waitForFunction(()=>document.querySelector('.header-logo-canvas').dataset.phase==='intro')
  assert.equal(await page.locator('.brand-mark-live').evaluate(el=>getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)', 'The compact mark sits on white')
  const canvas = host(page).locator('canvas')
  assert.ok(await canvas.evaluate(el=>el.width >= el.clientWidth * 4 && el.height >= el.clientHeight * 4), 'Tiny header artwork uses 4× resolution')
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.brand-mark-live>img')).opacity==='0')
  assert.equal(await page.locator('.brand-mark-live>img').evaluate(el=>getComputedStyle(el).opacity),'0','The fallback cannot cover the live drawing')
  const first = await canvas.screenshot()
  await page.waitForTimeout(700)
  assert.equal(first.equals(await canvas.screenshot()), false, 'The cable strokes actually draw into the 3D mark')
  await page.locator('.site-head').screenshot({path:'test-results/header-logo-drawing.png'})
  await page.waitForFunction(()=>document.querySelector('.header-logo-canvas').dataset.phase==='rest')
  const restAt = Date.now()
  await page.waitForFunction(()=>document.querySelector('.header-logo-canvas').dataset.phase==='rewind')
  await page.waitForFunction(()=>document.querySelector('.header-logo-canvas').dataset.phase==='intro')
  assert.ok(Date.now() - restAt < 3300, 'Rest and reset complete sooner before the next drawing cycle')
  await page.waitForFunction(()=>document.querySelector('.header-logo-canvas').dataset.phase==='rest')
  assert.equal(await page.locator('.site-foot canvas').count(), 0, 'Only the header gets the compact live mark')
  const brand = page.locator('.site-head .brand')
  const before = await page.locator('.brand-mark-live').evaluate(el=>getComputedStyle(el).boxShadow)
  await brand.hover(); await page.waitForTimeout(300)
  assert.equal(await page.locator('.brand-mark-live').evaluate(el=>getComputedStyle(el).animationName),'none','Hover glow keeps the live canvas steady and sharp')
  assert.notEqual(await page.locator('.brand-mark-live').evaluate(el=>getComputedStyle(el).boxShadow), before)
  await page.locator('.site-head').screenshot({path:'test-results/header-logo-desktop.png'})
  await page.evaluate(()=>{document.documentElement.dataset.pciMotion='paused'})
  await page.waitForFunction(()=>document.querySelector('.header-logo-canvas').dataset.phase==='still')
  await page.waitForTimeout(200)
  const still = await canvas.screenshot()
  await page.waitForTimeout(300)
  assert.ok(still.equals(await canvas.screenshot()), 'Saved motion pause settles the 3D artwork')
  await page.evaluate(()=>{delete document.documentElement.dataset.pciMotion})
  await page.waitForFunction(()=>document.querySelector('.header-logo-canvas').dataset.phase==='rest')
  const bounds = await brand.boundingBox()
  assert.ok(bounds.width < 250 && bounds.height <= 54, 'The slightly enlarged mark fits within the existing header')
  await page.goto(base+'/about-us/',{waitUntil:'domcontentloaded'})
  await ready(page)
  assert.equal(await page.getByRole('button',{name:'Play the PCI logo animation'}).count(),1, 'Original About logo remains available')
  await page.close()

  const reduced = await open({reducedMotion:'reduce',viewport:{width:390,height:844}})
  await ready(reduced)
  assert.equal(await host(reduced).getAttribute('data-phase'),'still')
  assert.ok(await reduced.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await reduced.locator('.site-head').screenshot({path:'test-results/header-logo-mobile.png'})
  assert.equal(await reduced.locator('.site-head .brand').getAttribute('href'),'/')
  await reduced.close()
  const staticPage=await open({javaScriptEnabled:false})
  assert.ok(await staticPage.locator('.brand-mark-live>img').evaluate(async img=>{await img.decode();return img.naturalWidth>0&&getComputedStyle(img).opacity==='1'}))
  await staticPage.close()
  const noGPU=await browser.newPage()
  await noGPU.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args)}
  })
  await noGPU.goto(base+'/products/',{waitUntil:'domcontentloaded'})
  assert.ok(await noGPU.locator('.brand-mark-live>img').evaluate(async img=>{await img.decode();return img.naturalWidth>0&&getComputedStyle(img).opacity==='1'}))
  await noGPU.close()
  assert.deepEqual(errors,[])
  console.log('Header logo passed: full cable-drawing sequence, automatic rewind and replay, hover glow, pause/resume, About stage, mobile, reduced motion, no-JS and WebGL fallback.')
} finally {await browser.close()}
