// Regenerates the About section fallback frames from the live three.js scene.
// Needs the site running (pnpm dev) at PCI_BROWSER_URL, default http://127.0.0.1:3000/.
import sharp from 'sharp'
import { chromium } from 'playwright-core'

const url = process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000/'
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const poses = [['opening', .2], ['settled', 1]]
try {
  const page = await browser.newPage({viewport:{width:1280,height:800}, deviceScaleFactor:1, reducedMotion:'reduce'})
  await page.goto(url, {waitUntil:'networkidle'})
  await page.addStyleTag({content:`
    html,body,.about-cable,.about-stage{background:transparent!important}
    body *{visibility:hidden!important}
    .about-cable .conductor-main{position:fixed!important;inset:auto!important;left:0!important;top:0!important;width:1280px!important;height:800px!important;transform:none!important}
    .about-cable .cable-webgl,.about-cable .cable-webgl *{visibility:visible!important}
  `})
  await page.locator('.about-cable').scrollIntoViewIfNeeded()
  await page.locator('.cable-webgl[data-ready=yes] canvas').waitFor()
  for (const [name, p] of poses) {
    await page.evaluate(p => document.querySelector('.about-cable').dispatchEvent(new CustomEvent('pci-cable-progress', {detail:p})), p)
    await page.waitForFunction(p => document.querySelector('.cable-webgl canvas')?.dataset.progress === p.toFixed(3), p)
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
    const png = await page.locator('.cable-webgl canvas').screenshot({omitBackground:true})
    const file = `public/media/about-cable-${name}.webp`
    const info = await sharp(png).resize(1280, 800).webp({quality:84, alphaQuality:90}).toFile(file)
    console.log(`${file}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} KB`)
  }
} finally { await browser.close() }
