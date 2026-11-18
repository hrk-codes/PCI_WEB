import { cache } from 'react'
import sanitize from 'sanitize-html'
import { getPayload } from 'payload'
import config from '@payload-config'
import snapshot from '@/content/wordpress.json'
import catalogue from '@/content/catalogue.json'

export { snapshot, catalogue }
export const company = 'PCI Cables Industries Pvt. Ltd.'
export const address = 'Om Complex, Monber Sastitala, Benaras Road, P.O. Mrigola, Dankuni, Hooghly 712311, West Bengal, India'
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pcicablesindustries.com').replace(/\/$/, '')
export const indexable = process.env.SITE_INDEXABLE === 'true' && process.env.VERCEL_ENV !== 'preview'
/** Default link-preview image (1200 × 630, the size WhatsApp, LinkedIn, Facebook and X expect). */
export const shareImage = { url: '/media/og/pci-cables-og.jpg', width: 1200, height: 630, alt: 'PCI Cables: cables, conductors and earth wire made in Dankuni, West Bengal' }
/** Search-result snippets are cut at about 160 characters: keep a description whole, ending on a sentence or word. */
export function metaDescription(text: string, limit = 160) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= limit) return clean
  const cut = clean.slice(0, limit)
  const sentence = cut.lastIndexOf('. ')
  if (sentence > limit * .55) return cut.slice(0, sentence + 1)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…'
}
export const families: Record<string, string> = { cables: 'Cables', conductors: 'Conductors', 'earth-wire': 'Earth Wire' }
export const articles = snapshot.filter((doc) => doc.kind === 'article').sort((a, b) => b.date.localeCompare(a.date))
/** Pages from the original site that are no longer published (they 404 and leave the sitemap). */
const retiredPages = new Set(['epc'])
export const publicDocs = snapshot.filter((doc) => doc.kind === 'page' && !retiredPages.has(doc.slug))
export const payload = cache(async () => getPayload({ config }))
export const cleanHtml = (html: string) => sanitize(html, {
  allowedTags: [...sanitize.defaults.allowedTags, 'img','figure','figcaption','details','summary'],
  allowedAttributes: { a: ['href','title'], img: ['src','alt','width','height'], td: ['rowspan','colspan'], th: ['scope','rowspan','colspan'] },
  allowedSchemes: ['https','http','mailto','tel'], allowProtocolRelative: false,
  exclusiveFilter: (frame) => frame.tag === 'img' && !/^\/media\/[a-z0-9._-]+$/i.test(frame.attribs.src || ''),
})

export const editedMany = async (slugs: string[]) => {
  const result = new Map<string,{ title:string; summary:string; html:string }>()
  if (!slugs.length) return result
  try {
    const cms = await payload()
    const { docs } = await cms.find({ collection: 'site-content', where: { and: [{ slug: { in: slugs } }, { published: { equals: true } }] }, limit: slugs.length, depth: 0, overrideAccess: true })
    for (const d of docs) result.set(String(d.slug), { title: String(d.title), summary: String(d.summary), html: cleanHtml(String(d.html || '')) })
  } catch (err) {
    console.error('CMS content unavailable', err instanceof Error ? err.message : 'unknown error')
  }
  return result
}
export const edited = cache(async (slug: string) => (await editedMany([slug])).get(slug) || null)

export function structured(value: Record<string, unknown>) {
  return JSON.stringify({ '@context': 'https://schema.org', ...value }).replace(/</g, '\\u003c')
}
