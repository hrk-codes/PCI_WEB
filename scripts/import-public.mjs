import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { load } from 'cheerio'
import sanitize from 'sanitize-html'
import sharp from 'sharp'

const origin = 'https://pcicablesindustries.com'
const local = process.env.PCI_MEDIA_SOURCE || 'D:/Hrithik_pci/htdocs/pcicables/wp-content/uploads'
const pathToAsset = new Map()
await mkdir('public/media', { recursive: true })
await mkdir('content', { recursive: true })

async function asset(relative, name) {
  const key = relative.replace(/^\/+/, '')
  if (!/^[-\w(). /%]+\.(?:pdf|png|jpe?g|webp)$/i.test(key) || key.includes('..')) return ''
  if (pathToAsset.has(key)) return pathToAsset.get(key)
  const pdf = /\.pdf$/i.test(key)
  const dest = name || key.replace(/[^\w.-]+/g, '-').toLowerCase().replace(/\.(png|jpe?g|webp)$/i, '.webp')
  try {
    let data
    try { data = await readFile(join(local, decodeURIComponent(key))) }
    catch {
      const res = await fetch(origin + '/wp-content/uploads/' + key, { signal: AbortSignal.timeout(16000) })
      if (!res.ok) throw Error(String(res.status))
      data = Buffer.from(await res.arrayBuffer())
    }
    if (pdf) {
      if (!data.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw Error('Invalid PDF')
      await writeFile(join('public/media', dest), data)
    } else {
      const limit = name?.startsWith('hero') ? 1600 : 1100
      let picture = sharp(data).rotate()
      if (name === 'hero-cables.webp') {
        const meta = await picture.metadata()
        picture = picture.extract({ left:0, top:0, width:meta.width, height:Math.floor(meta.height*.66) })
      }
      await picture.resize({ width: limit, withoutEnlargement: true }).webp({ quality: 83 }).toFile(join('public/media', dest))
    }
    const url = '/media/' + dest
    pathToAsset.set(key, url)
    return url
  } catch (err) {
    console.warn('Skipped', key, err.message)
    return ''
  }
}

const manual = {
  'logo.webp': '2024/01/logo.png',
  'hero-range.webp': '2024/01/front.jpg',
  'hero-cables.webp': '2025/12/cables-1.jpg',
  'factory.webp': '2025/11/image-141.jpg',
  'testing.webp': '2024/01/testing.jpg',
  'plant.webp': '2025/11/image-121A.jpg',
  'event.webp': '2025/11/elecrama-1.jpg',
  'rail.webp': '2024/03/blog.jpg',
  'eco-news.webp': '2024/03/ECO-1.jpg',
  'catalogue.pdf': '2025/06/Catalogue.pdf',
  'aerial-bunched-cable.webp': '2024/02/AB-Cable.jpg',
  'lt-xlpe-cable.webp': '2024/02/LT-XLPE-Cable.jpg',
  'pvc-power-cable.webp': '2024/02/PVC-Power-Cable.jpg',
  'control-cable.webp': '2024/02/Control-Cable.jpg',
  'service-cable.webp': '2024/02/Service-Cable.jpg',
  'covered-conductor.webp': '2025/12/Covered-Conductor-1.jpg',
  'aac.webp': '2024/01/AAC-Conductor.png',
  'aaac.webp': '2024/01/AAAC-Conductor.png',
  'acsr.webp': '2024/01/ACSR-Conductor.png',
  'aacsr.webp': '2024/01/AACSR-Conductor.png',
  'al-59.webp': '2024/01/AL-59.jpg',
  'acar.webp': '2024/01/ACAR-Conductor.png',
  'eco-panther.webp': '2024/07/ECO-Conductor.png',
  'gi-earth-wire.webp': '2024/09/Earth-Wire.jpg',
}
for (const pdf of ['ABCable','XLPECable','Control-PVC-Cable','MVCC','AAC','AAAC','ACSR','AACSR','AL-59','ACAR','ECO','GI-EWire']) manual[pdf.toLowerCase()+'.pdf'] = '2025/12/'+pdf+'.pdf'
for (const [name, source] of Object.entries(manual)) {
  if (!(await asset(source, name))) throw Error('Missing required PCI asset: '+name)
}
const logos = {
  Utilities: ['WBSEDCL','APDCL','AEGCL','AVVNL','BSPTCL','JVVNL','CSPDCL','DVVNL','MSETCL','MVVNL','UHBVN','TPNODL'],
  'Rail & public sector': ['CORE','IRCON','NCRTC','RVNL','DFCC','Konkan-Railway','Northern-Railway','East-Central-Railway','CoalIndia'],
  International: ['NEA-Nepal','UETCL-Uganda','TCN-Nigeria','BPC-Bhutan','EDCL-Rwanda','EDM-Mozambique'],
  Renewables: ['ACME','renew','sprng','solarcraft','oriano','sitac'],
}
const aliases = { WBSEDCL: 'West Bengal State Electricity Distribution Company', APDCL: 'Assam Power Distribution Company', RVNL: 'Rail Vikas Nigam', ACME: 'ACME Solar', renew: 'ReNew', sprng: 'Sprng Energy', oriano: 'Oriano Solar', solarcraft: 'Solarcraft', sitac: 'Sitac' }
const clientGroups = {}
for (const [group, names] of Object.entries(logos)) {
  clientGroups[group] = []
  for (const n of names) {
    for (const month of ['2024/01','2024/09','2024/03','2025/11']) {
      const url = await asset(month+'/'+n+'.png', 'client-'+n.toLowerCase()+'.webp')
      if (url) { clientGroups[group].push({ name: aliases[n] || n.replaceAll('-', ' '), image: url }); break }
    }
  }
}
await writeFile('content/clients.json', JSON.stringify(clientGroups, null, 2)+'\n')

async function wp(type) {
  const res = await fetch(origin + '/wp-json/wp/v2/' + type + '?per_page=100&_fields=slug,date,title,excerpt,content,link', { signal: AbortSignal.timeout(25000) })
  if (!res.ok) throw Error(type + ': ' + res.status)
  return res.json()
}
function text(input) { return load(input || '').root().text().replace(/\s+/g, ' ').trim() }
const excluded = new Set(['news-bckup','product-back','com','sample-page','home'])
const [pages, posts] = await Promise.all([wp('pages'), wp('posts')])
const snapshots = []
const wpRedirects = {}
for (const [kind, docs] of [['page', pages], ['article', posts]]) {
  for (const doc of docs) {
    if (excluded.has(doc.slug)) continue
    const $ = load(doc.content.rendered)
    $('script, style, iframe, form, .wpforms-container, .wp-block-wpforms-form-selector, .wp-block-shortcode, .n2-ss-slider, video, audio').remove()
    for (const el of $('img[src],a[href]').toArray()) {
      const node = $(el)
      const attr = el.name === 'img' ? 'src' : 'href'
      try {
        const url = new URL(node.attr(attr), origin)
        if (url.hostname.replace(/^www\./, '') === 'pcicablesindustries.com') {
          if (url.pathname.startsWith('/wp-content/uploads/')) {
            const path = await asset(url.pathname.split('/uploads/')[1])
            if (path) { node.attr(attr, path); if (path.endsWith('.pdf')) wpRedirects[url.pathname] = path }
            else if (el.name === 'img') node.remove()
            else node.replaceWith(node.text())
          } else node.attr(attr, url.pathname + url.search + url.hash)
        } else if (el.name === 'img') node.remove()
      } catch { node.removeAttr(attr) }
    }
    const html = sanitize($('body').html() || '', {
      allowedTags: [...sanitize.defaults.allowedTags, 'img', 'figure', 'figcaption', 'details', 'summary'],
      allowedAttributes: { a: ['href','title'], img: ['src','alt','width','height'], td: ['rowspan','colspan'], th: ['scope','rowspan','colspan'] },
      allowedSchemes: ['http','https','mailto','tel'], allowProtocolRelative: false,
    }).replace(/\[(?:robo-gallery|smartslider3|visualizer|wpforms)[^\]]*\]/gi, '').trim()
    const title = text(doc.title.rendered)
    const summary = (text(doc.excerpt?.rendered) || text(html)).slice(0, 155).replace(/\s+\S*$/, '')
    snapshots.push({ slug: doc.slug, title, kind, summary, html, date: doc.date })
    if (kind === 'article') {
      const old = new URL(doc.link).pathname
      if (old.replace(/\/$/, '') !== '/blog/'+doc.slug) wpRedirects[old] = '/blog/'+doc.slug+'/'
    }
  }
}
for (const [key, url] of pathToAsset) if (url.endsWith('.pdf')) wpRedirects['/wp-content/uploads/'+key] = url
await writeFile('content/wordpress.json', JSON.stringify(snapshots, null, 2)+'\n')
await writeFile('content/redirects.json', JSON.stringify(wpRedirects, null, 2)+'\n')
console.log('Imported', snapshots.length, 'public documents and', pathToAsset.size, 'assets')
