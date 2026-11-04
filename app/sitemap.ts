import type { MetadataRoute } from 'next'
import { articles, catalogue, publicDocs, siteUrl } from '@/lib/content'
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/request-quote/', '/privacy/', ...publicDocs.map(d=>'/'+d.slug+'/'), ...catalogue.map(p=>'/products/'+p.slug+'/'), ...articles.map(d=>'/blog/'+d.slug+'/')].map(path=>({ url:siteUrl+path }))
}
