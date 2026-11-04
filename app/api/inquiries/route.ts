import { createHmac } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { catalogue, payload } from '@/lib/content'

const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control':'no-store' } })
const kinds = ['quote','contact','career','vendor']
const limits = { name:100, email:200, phone:24, company:160, message:3000, product:100, kind:16, consent:8, website:200, source:300 }
const recipients: Record<string, string | undefined> = {
  quote:process.env.SALES_EMAIL, contact:process.env.SALES_EMAIL, career:process.env.HR_EMAIL, vendor:process.env.PROCUREMENT_EMAIL,
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) return fail('This request was not allowed.',403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return fail('Send JSON.',415)
  if (Number(request.headers.get('content-length')) > 16000) return fail('The submission is too large.',413)
  let raw
  try {
    const reader = request.body?.getReader()
    if (!reader) return fail('Invalid submission.',400)
    let length = 0
    const chunks = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 16000) { await reader.cancel(); return fail('The submission is too large.',413) }
      chunks.push(value)
    }
    raw = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch { return fail('Invalid submission.',400) }
  if (!raw || typeof raw!=='object' || Array.isArray(raw)) return fail('Invalid submission.',400)
  const values: Record<string, string> = {}
  for (const [key, limit] of Object.entries(limits)) {
    if (raw[key] !== undefined && (typeof raw[key] !== 'string' || raw[key].length > limit)) return fail('Check the length and format of your details.',400)
    values[key] = (raw[key] || '').trim()
  }
  const { name, email, phone, company, message, product, kind, consent, website, source } = values
  if (website) return fail('Invalid submission.',400)
  if (!kinds.includes(kind) || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[\d(). -]{7,24}$/.test(phone) || phone.replace(/\D/g,'').length < 7 || message.length<5 || consent!=='yes' || (kind==='vendor' && !company) || (product && (kind!=='quote' || !catalogue.some(p=>p.slug===product)))) return fail('Check all required details and confirm the privacy notice.',400)
  try {
    const cms = await payload()
    const ip = process.env.VERCEL ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || email.toLowerCase()) : email.toLowerCase()
    const submitterKey = createHmac('sha256',process.env.PAYLOAD_SECRET!).update(ip).digest('hex')
    const recent = await cms.count({ collection:'inquiries', where:{ and:[{submitterKey:{equals:submitterKey}},{createdAt:{greater_than_equal:new Date(Date.now()-900000).toISOString()}}] } })
    if (recent.totalDocs >= 5) return fail('Too many submissions. Try again in 15 minutes.',429)
    const to = recipients[kind]
    const sendEmail = Boolean(to && process.env.MAIL_FROM && process.env.RESEND_API_KEY)
    const entry = await cms.create({ collection:'inquiries', overrideAccess:true, data:{ kind, name, email, phone, company, message, product, source:/^\/[a-z0-9/-]*$/i.test(source)?source:'', submitterKey, status:'new', emailStatus:sendEmail?'pending':'not-configured' } })
    if (sendEmail) {
      let sent = false
      try {
        const result = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:'Bearer '+process.env.RESEND_API_KEY, 'Content-Type':'application/json', 'Idempotency-Key':'pci-inquiry/'+entry.id }, body:JSON.stringify({ from:process.env.MAIL_FROM, to:[to], subject:'New PCI website '+kind+' submission', text:'A new submission is ready for staff review in the PCI website CMS. Reference: '+entry.id }), signal:AbortSignal.timeout(6000) })
        sent = result.ok
      } catch { /* The inquiry is already saved. */ }
      await cms.update({ collection:'inquiries', id:entry.id, data:{ emailStatus:sent?'sent':'failed' } }).catch(()=>console.error('Could not update inquiry notification status'))
    }
    return NextResponse.json({ ok:true }, { status:201, headers:{'Cache-Control':'no-store'} })
  } catch {
    console.error('Inquiry could not be stored')
    return fail('The inquiry could not be saved. Please try again or contact PCI by phone or email.',503)
  }
}
