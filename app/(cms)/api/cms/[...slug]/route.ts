import config from '@payload-config'
import { NextResponse } from 'next/server'
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes'
export const GET = REST_GET(config)
const post = REST_POST(config)
export const POST: typeof post = (request, context) => {
  if ((process.env.VERCEL || process.env.BLOCK_PUBLIC_ADMIN_SETUP === 'true') && /\/staff\/first-register\/?$/.test(new URL(request.url).pathname)) {
    return Promise.resolve(NextResponse.json({ error: 'Create the first staff account through the deployment setup.' }, { status: 403 }))
  }
  return post(request, context)
}
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
