// SEO readiness check for every public page. Run it on your local copy, a production build or the live site:
//   node scripts/test-seo.mjs [base URL] [--production]
//   pnpm test:seo -- https://pcicablesindustries.com --production
// --production also requires that search engines are allowed in (robots.txt, no noindex) and that every URL in the
// sitemap uses HTTPS on the site's own domain. Without it, a site that hides itself (the local default) passes
// with a note instead. Exits with code 1 if any check fails.
import { readFile } from 'node:fs/promises'
import { load } from 'cheerio'
import sharp from 'sharp'

const args = process.argv.slice(2)
const production = args.includes('--production')
const base = (args.find(a => /^https?:\/\//.test(a)) || process.env.PCI_SMOKE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const host = new URL(base).host
const fetchPath = (path, options = {}) => fetch(new URL(path, base), { signal: AbortSignal.timeout(35000), redirect: 'manual', ...options })
const results = []
const notes = []
function check(name, ok, detail = '') { results.push({ name, ok: Boolean(ok), detail }) }

// robots.txt and sitemap
const robots = await (await fetchPath('/robots.txt')).text()
const blocked = /Disallow:\s*\/\s*$/m.test(robots) && !/Allow:\s*\/\s*$/m.test(robots)
if (production) check('robots.txt lets search engines in', !blocked, blocked ? 'robots.txt says "Disallow: /" (set SITE_INDEXABLE=true)' : '')
else if (blocked) notes.push('Search engines are blocked (robots.txt "Disallow: /", pages noindex). That is right for a local or staging copy; production must set SITE_INDEXABLE=true.')
if (!blocked) {
  check('robots.txt points to the sitemap', /Sitemap:\s*\S+\/sitemap\.xml/i.test(robots))
  check('robots.txt keeps /admin/ and /api/ out', /Disallow:\s*\/admin\//.test(robots) && /Disallow:\s*\/api\//.test(robots))
}
const sitemapResponse = await fetchPath('/sitemap.xml')
const sitemap = await sitemapResponse.text()
check('sitemap.xml is served', sitemapResponse.status === 200)
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => ({ loc: m[1].match(/<loc>(.*?)<\/loc>/)?.[1] ?? '', lastmod: m[1].match(/<lastmod>(.*?)<\/lastmod>/)?.[1] }))
check('sitemap lists pages', entries.length > 0, `${entries.length} URLs`)
check('every sitemap URL has a last-modified date', entries.every(e => e.lastmod))
const sitemapHosts = new Set(entries.map(e => new URL(e.loc).host))
if (production) {
  if (base.startsWith('https://')) check('sitemap URLs use HTTPS', entries.every(e => e.loc.startsWith('https://')))
  else notes.push('Tested over plain HTTP (a local production run), so the HTTPS rule is skipped; it applies when you test the live https:// site.')
  check('sitemap URLs are on the site’s own domain', sitemapHosts.size === 1 && sitemapHosts.has(host), [...sitemapHosts].join(', '))
}

// Every page
const titles = new Map(), descriptions = new Map(), images = new Set()
let organisationLogo = null
for (const { loc } of entries) {
  const path = new URL(loc).pathname
  const response = await fetchPath(path)
  const label = path
  if (response.status !== 200) { check(`${label} loads`, false, `status ${response.status}`); continue }
  const $ = load(await response.text())
  const problems = []
  const title = $('title').first().text().trim()
  const description = $('meta[name="description"]').attr('content')?.trim() ?? ''
  const canonical = $('link[rel="canonical"]').attr('href') ?? ''
  const robotsMeta = $('meta[name="robots"]').attr('content') ?? ''
  if (!title) problems.push('no title'); else if (title.length > 65) problems.push(`title ${title.length} characters (keep to 65)`)
  if (description.length < 70 || description.length > 160) problems.push(`description ${description.length} characters (aim for 70–160)`)
  if (!canonical) problems.push('no canonical link')
  else if (new URL(canonical, base).pathname !== path) problems.push(`canonical points to ${canonical}`)
  else if (production && new URL(canonical).host !== host) problems.push(`canonical on another domain (${new URL(canonical).host})`)
  for (const property of ['og:title', 'og:description', 'og:image']) if (!$(`meta[property="${property}"]`).attr('content')) problems.push(`no ${property}`)
  if (!$('meta[name="twitter:card"]').attr('content')) problems.push('no twitter:card')
  const ogImage = $('meta[property="og:image"]').attr('content')
  if (ogImage) images.add(ogImage)
  const h1 = $('h1').length
  if (h1 !== 1) problems.push(`${h1} h1 headings (want 1)`)
  if (!$('html').attr('lang')) problems.push('no lang attribute')
  const missingAlt = $('img:not([alt])').length
  if (missingAlt) problems.push(`${missingAlt} images without alt text`)
  const scripts = $('script[type="application/ld+json"]').toArray()
  if (!scripts.length) problems.push('no structured data')
  for (const s of scripts) {
    try {
      const data = JSON.parse($(s).text())
      if (data['@type'] === 'Organization') organisationLogo = data.logo
    } catch { problems.push('structured data is not valid JSON') }
  }
  const noindex = /noindex/i.test(robotsMeta)
  if (production && noindex) problems.push('page is marked noindex')
  if (!production && !blocked && noindex) problems.push('page is marked noindex while the site allows search engines')
  ;(titles.get(title) ?? titles.set(title, []).get(title)).push(path)
  ;(descriptions.get(description) ?? descriptions.set(description, []).get(description)).push(path)
  check(`${label}`, problems.length === 0, problems.join('; '))
}
const dupTitles = [...titles].filter(([, p]) => p.length > 1), dupDescriptions = [...descriptions].filter(([, p]) => p.length > 1)
check('page titles are unique', !dupTitles.length, dupTitles.map(([t, p]) => `"${t}" on ${p.join(', ')}`).join('; '))
check('meta descriptions are unique', !dupDescriptions.length, dupDescriptions.map(([, p]) => p.join(', ')).join('; '))

// Share images and the organisation logo
for (const src of images) {
  const response = await fetchPath(src)
  const ok = response.status === 200
  let detail = ok ? '' : `status ${response.status}`
  if (ok) { const m = await sharp(Buffer.from(await response.arrayBuffer())).metadata(); if (m.width < 600) detail = `${m.width}×${m.height} is small for link previews` }
  check(`share image ${new URL(src, base).pathname} works`, ok && !detail, detail)
}
check('homepage has Organization structured data with a logo', organisationLogo)
if (organisationLogo) {
  const response = await fetchPath(organisationLogo)
  const m = response.status === 200 ? await sharp(Buffer.from(await response.arrayBuffer())).metadata() : null
  check('Organization logo is at least 112 × 112 px', m && m.width >= 112 && m.height >= 112, m ? `${m.width}×${m.height}` : `status ${response.status}`)
}

// Pages that must stay out of search, missing pages, and old addresses
for (const path of ['/hero-film/', '/animation-preview/', '/conductor-render/']) {
  const response = await fetchPath(path)
  const html = response.status === 200 ? await response.text() : ''
  check(`${path} stays out of search`, response.status !== 200 || /<meta name="robots" content="[^"]*noindex/.test(html))
}
check('unknown pages return 404', (await fetchPath('/this-page-does-not-exist/')).status === 404)
const redirects = JSON.parse(await readFile('content/redirects.json', 'utf8'))
const legacy = Object.entries(redirects)
let redirectFailures = []
for (const [from, to] of legacy) {
  const response = await fetchPath(from)
  if (![301, 308].includes(response.status) || new URL(response.headers.get('location') ?? '', base).pathname !== to) redirectFailures.push(from)
}
check('old WordPress addresses redirect permanently', !redirectFailures.length, redirectFailures.length ? `${redirectFailures.length} failing, e.g. ${redirectFailures[0]}` : `${legacy.length} redirects`)

// Report
const failed = results.filter(r => !r.ok)
console.log(`\nSEO check · ${base}${production ? ' · production rules' : ''}\n`)
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? ` · ${r.detail}` : ''}`)
for (const n of notes) console.log(`\nNote: ${n}`)
console.log(`\n${results.length - failed.length} of ${results.length} checks passed.`)
if (failed.length) process.exit(1)
