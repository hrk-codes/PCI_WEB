import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { load } from 'cheerio'

const base = (process.env.PCI_SMOKE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const read = async name => JSON.parse(await readFile('content/'+name+'.json','utf8'))
const [docs, products, redirects] = await Promise.all(['wordpress','catalogue','redirects'].map(read))
const pageRoutes = ['/', '/privacy/', '/request-quote/', ...docs.map(d=>d.kind==='article'?'/blog/'+d.slug+'/':'/'+d.slug+'/'), ...products.map(p=>'/products/'+p.slug+'/')]
const unique = new Set(pageRoutes)
const assets = new Set()
const fetchPath = (path, options) => fetch(base+path, { signal:AbortSignal.timeout(35000), ...options })

for (const route of unique) {
  const res = await fetchPath(route)
  assert.equal(res.status,200,route)
  const $ = load(await res.text())
  assert.equal($('h1').length,1,route+' should have one page heading')
  assert.ok($('title').text().includes('PCI Cables'),route+' title')
  assert.ok($('link[rel=canonical]').attr('href')?.endsWith(route),route+' canonical')
  for (const tag of $('a[href],img[src]').toArray()) {
    const value = $(tag).attr(tag.name==='a'?'href':'src')
    if (!value?.startsWith('/')) continue
    if (value.startsWith('/_next/image?')) {
      const media = new URL(value,base).searchParams.get('url')
      if (media?.startsWith('/media/')) assets.add(media)
    } else if (value.startsWith('/media/')) assets.add(value)
    else if (!value.startsWith('/_next/')) {
      const target = new URL(value,base).pathname
      assert.ok(unique.has(target) || unique.has(target+'/') || target in redirects, route+' links to missing '+value)
    }
  }
}
for (const asset of assets) {
  const res = await fetchPath(asset,{method:'HEAD'})
  assert.equal(res.status,200,asset)
}
for (const [old, target] of Object.entries(redirects)) {
  const res = await fetchPath(old,{redirect:'manual'})
  assert.ok([301,308].includes(res.status),old+' permanent redirect')
  assert.equal(new URL(res.headers.get('location'),base).pathname,target,old)
}
const sitemap = await fetchPath('/sitemap.xml')
assert.equal(sitemap.status,200)
assert.equal((await sitemap.text()).match(/<loc>/g).length,unique.size)
assert.equal((await fetchPath('/robots.txt')).status,200)
assert.equal((await fetchPath('/page-that-does-not-exist/')).status,404)
const admin = await fetchPath('/admin/')
assert.equal(admin.status,200,'Admin interface')
const denied = await fetchPath('/api/cms/inquiries/')
assert.ok([401,403].includes(denied.status),'Inquiries are private')
const json = (data, cookie) => ({
  method:'POST', headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}, body:JSON.stringify(data),
})
const invalid = await fetchPath('/api/inquiries/',json({kind:'quote'}))
assert.equal(invalid.status,400,'Missing details are rejected')
const foreign = await fetchPath('/api/inquiries/',{ ...json({}), headers:{'Content-Type':'application/json',Origin:'https://example.test'} })
assert.equal(foreign.status,403,'Foreign origin is rejected')
if (process.env.PCI_SMOKE_WRITE==='1') {
  assert.match(base,/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/,'Write checks use a local isolated test database only')
  const email = 'pci-qa-'+randomBytes(6).toString('hex')+'@example.test'
  const password = randomBytes(30).toString('hex')
  const register = await fetchPath('/api/cms/staff/first-register/',json({email,password,name:'Smoke test staff'}))
  assert.equal(register.status,200,'First staff account on test database')
  const login = await fetchPath('/api/cms/staff/login/',json({email,password}))
  assert.equal(login.status,200,'Staff login')
  const cookie = login.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie,'Staff login sets a session cookie')
  for (const kind of ['quote','contact','career','vendor']) {
    const created = await fetchPath('/api/inquiries/',json({kind,email,name:'Test submission',phone:'+91 1234567890',company:'Test only',message:'Automated smoke test, not a real inquiry.',product:kind==='quote'?'acsr':'',consent:'yes',source:'/request-quote/'}))
    assert.equal(created.status,201,kind+' form saves')
  }
  const inbox = await fetchPath('/api/cms/inquiries/?limit=20',{headers:{Cookie:cookie}})
  assert.equal(inbox.status,200,'Authenticated staff can see submissions')
  const records = (await inbox.json()).docs
  for (const kind of ['quote','contact','career','vendor']) assert.ok(records.some(d=>d.kind===kind && d.email===email),kind+' record visible in CMS')
  assert.equal(records.find(d=>d.kind==='quote' && d.email===email).product,'acsr')
}
console.log('Verified '+unique.size+' pages, '+assets.size+' linked media files, '+Object.keys(redirects).length+' redirects, sitemap, 404, and private submissions.')
