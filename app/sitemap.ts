import type { MetadataRoute } from 'next'
import { articles, catalogue, publicDocs, siteUrl } from '@/lib/content'

/**
 * Every public page. Blog posts carry their publication date; the rest carry the date the site was built (the sitemap
 * is generated at build time), which tells search engines when to re-crawl after a release.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const built = new Date()
  const pages = ['/', '/request-quote/', '/privacy/', ...publicDocs.map(d => '/' + d.slug + '/'), ...catalogue.map(p => '/products/' + p.slug + '/')]
  return [
    ...pages.map(path => ({ url: siteUrl + path, lastModified: built })),
    ...articles.map(d => ({ url: siteUrl + '/blog/' + d.slug + '/', lastModified: new Date(d.date + '+05:30') })),
  ]
}
