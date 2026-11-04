import type { MetadataRoute } from 'next'
import { indexable, siteUrl } from '@/lib/content'
export default function robots(): MetadataRoute.Robots {
  return indexable ? { rules:{ userAgent:'*', allow:'/', disallow:['/admin/','/api/'] }, sitemap:siteUrl+'/sitemap.xml' } : { rules:{ userAgent:'*', disallow:'/' } }
}
