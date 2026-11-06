import { withPayload } from '@payloadcms/next/withPayload'
import { readFileSync } from 'node:fs'
const legacy = JSON.parse(readFileSync(new URL('./content/redirects.json', import.meta.url), 'utf8'))

export default withPayload({
  distDir: process.env.PCI_ISOLATED_BUILD === '1' ? '.next-animation-build' : '.next',
  poweredByHeader: false,
  devIndicators: false,
  trailingSlash: true,
  async redirects() {
    return [
      { source: '/updates', destination: '/news/', permanent: true },
      { source: '/contact', destination: '/contact-us/', permanent: true },
      { source: '/careers', destination: '/career/', permanent: true },
      { source: '/about', destination: '/about-us/', permanent: true },
      ...Object.entries(legacy).map(([source, destination]) => ({ source, destination, permanent: true })),
      { source: '/:path*', has: [{ type: 'host', value: 'www.pcicablesindustries.com' }], destination: 'https://pcicablesindustries.com/:path*', permanent: true },
    ]
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ] }, ...(!process.env.SITE_INDEXABLE || process.env.SITE_INDEXABLE !== 'true' || process.env.VERCEL_ENV === 'preview'
      ? [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
      : [{ source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }, { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }])]
  },
})
