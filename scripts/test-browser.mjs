import assert from 'node:assert/strict'
import { access, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'
const require = createRequire(import.meta.url)
const output = 'test-results'
await mkdir(output,{recursive:true})
const url = process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000'
const paths = [process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean)
let executablePath
for (const path of paths) { try { await access(path); executablePath = path; break } catch {} }
const browser = await chromium.launch({ headless:true, executablePath })
const browserErrors = []
function track(page) {
  page.on('pageerror',error=>browserErrors.push(error.message))
  page.on('response',response=>{
    if (response.url().startsWith(url) && response.status()>=400 && ['image','stylesheet','script','document'].includes(response.request().resourceType())) browserErrors.push(response.status()+' '+response.url())
  })
}
async function scan(page, label) {
  await page.addScriptTag({ path:require.resolve('axe-core/axe.min.js') })
  const results = await page.evaluate(() => window.axe.run({ runOnly:{ type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } }))
  assert.deepEqual(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target.join(' '))})),[],label+' accessibility')
}
const checkOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
try {
  const desktop = await browser.newPage({ viewport:{width:1440,height:950}, reducedMotion:'no-preference' })
  track(desktop)
  await desktop.goto(url)
  await desktop.getByRole('heading',{name:'The power behind every connection.'}).waitFor()
  await desktop.screenshot({path:output+'/desktop.png'})
  await scan(desktop,'Desktop home')
  const motif = desktop.locator('.ambient').first()
  await motif.scrollIntoViewIfNeeded()
  await desktop.waitForFunction(()=>document.querySelector('.ambient')?.getAttribute('data-entered')==='yes')
  assert.equal(await motif.locator('svg').first().evaluate(e=>getComputedStyle(e).animationName),'motif-drift','Background motifs animate when their section enters view')
  await desktop.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}))
  await desktop.getByRole('button',{name:'Next slide'}).click()
  await desktop.getByRole('heading',{name:'Engineered for what comes next.'}).waitFor()
  const info = desktop.getByRole('button',{name:'Quick info'})
  await info.focus()
  await desktop.keyboard.press('Enter')
  const dialog = desktop.getByRole('dialog',{name:'How can we help?'})
  await dialog.waitFor()
  await scan(desktop,'Quick information')
  await desktop.screenshot({path:output+'/quick-info.png'})
  await dialog.getByRole('checkbox',{name:'Pause background motion'}).check()
  assert.equal(await desktop.locator('html').getAttribute('data-pci-motion'),'paused')
  assert.equal(await motif.locator('svg').first().evaluate(e=>getComputedStyle(e).animationName),'none','The site setting stops background motion')
  await desktop.keyboard.press('Escape')
  await dialog.waitFor({state:'hidden'})
  assert.equal(await info.evaluate(el=>el===document.activeElement),true,'Closing the panel returns focus to its trigger')
  await desktop.reload()
  await desktop.waitForFunction(()=>document.documentElement.dataset.pciMotion==='paused')
  const mobile = await browser.newPage({ viewport:{width:390,height:844}, isMobile:true, deviceScaleFactor:1, hasTouch:true, reducedMotion:'reduce' })
  track(mobile)
  await mobile.goto(url)
  await mobile.getByRole('heading',{name:'The power behind every connection.'}).waitFor()
  assert.equal(await checkOverflow(mobile),true,'Mobile home must fit viewport')
  assert.equal(await mobile.locator('.ambient svg').first().evaluate(e=>getComputedStyle(e).animationName),'none','Reduced motion disables background animation')
  await mobile.screenshot({path:output+'/mobile.png'})
  await mobile.getByText('Menu',{exact:false}).first().click()
  assert.equal(await mobile.getByRole('navigation',{name:'Mobile navigation'}).isVisible(),true)
  await mobile.goto(url+'/products/')
  await mobile.getByRole('heading',{name:'Cables',exact:true}).waitFor()
  assert.equal(await checkOverflow(mobile),true,'Mobile catalogue must fit viewport')
  await scan(mobile,'Mobile catalogue')
  await mobile.goto(url+'/products/acsr/')
  await mobile.getByRole('heading',{name:'Product information'}).waitFor()
  assert.equal(await checkOverflow(mobile),true,'Product detail must fit viewport')
  await scan(mobile,'Mobile product page')
  await mobile.goto(url+'/request-quote/?product=acsr')
  assert.equal(await mobile.getByRole('combobox',{name:'Product',exact:true}).inputValue(),'acsr','Quote form preselects the product')
  await scan(mobile,'Mobile quote form')
  assert.deepEqual(browserErrors,[],'No client exceptions or missing browser resources')
  console.log('Desktop and mobile browser checks passed, including keyboard focus, reduced motion and automated WCAG checks.')
} finally { await browser.close() }
