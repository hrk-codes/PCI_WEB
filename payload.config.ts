import path from 'node:path'
import { buildConfig, type CollectionConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'

const staff: CollectionConfig['access'] = {
  read: ({ req }) => !!req.user,
  create: ({ req }) => !!req.user,
  update: ({ req }) => !!req.user,
  delete: ({ req }) => !!req.user,
}

const secret = process.env.PAYLOAD_SECRET
if (!secret || secret.length < 32) throw new Error('Set PAYLOAD_SECRET to a secure value of at least 32 characters.')
if (process.env.VERCEL && !process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to a persistent PostgreSQL database on Vercel.')

export default buildConfig({
  secret,
  admin: { user: 'staff', meta: { titleSuffix: ' · PCI Cables' }, importMap: { importMapFile: path.resolve('app/(cms)/admin/importMap.js') } },
  routes: { admin: '/admin', api: '/api/cms' },
  graphQL: { disable: true },
  typescript: { autoGenerate: false },
  email: () => ({
    name: 'pci-resend',
    defaultFromName: 'PCI Cables',
    defaultFromAddress: process.env.MAIL_FROM || 'no-reply@pcicablesindustries.com',
    async sendEmail(message) {
      if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) throw new Error('Email delivery is not configured.')
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer '+process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...message, from: process.env.MAIL_FROM }),
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) throw new Error('Email delivery failed.')
      return res.json()
    },
  }),
  db: process.env.DATABASE_URL
    ? postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL }, push: false, migrationDir: path.resolve('migrations') })
    : sqliteAdapter({ client: { url: process.env.SQLITE_URL || 'file:.data/pci.sqlite' } }),
  collections: [
    { slug: 'staff', auth: { cookies: { sameSite: 'Lax', secure: Boolean(process.env.VERCEL) }, maxLoginAttempts: 5 }, access: staff, fields: [{ name: 'name', type: 'text' }] },
    {
      slug: 'site-content', access: staff, admin: { useAsTitle: 'title', defaultColumns: ['title','slug','kind','updatedAt'] },
      fields: [
        { name: 'slug', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
        { name: 'kind', type: 'select', options: ['page','product','article','home'], required: true, admin: { readOnly: true } },
        { name: 'title', type: 'text', required: true },
        { name: 'summary', type: 'textarea', required: true, maxLength: 360 },
        { name: 'html', label: 'Page content (HTML)', type: 'code', admin: { language: 'html' } },
        { name: 'published', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      slug: 'inquiries', access: { ...staff, create: () => false }, admin: {
        useAsTitle: 'name', defaultColumns: ['name','kind','company','status','emailStatus','createdAt'],
      },
      fields: [
        { name: 'kind', type: 'select', options: ['quote','contact','career','vendor'], required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'text' },
        { name: 'company', type: 'text' },
        { name: 'product', type: 'text' },
        { name: 'message', type: 'textarea', required: true },
        { name: 'status', type: 'select', options: ['new','reviewing','closed'], defaultValue: 'new' },
        { name: 'emailStatus', type: 'select', options: ['not-configured','pending','sent','failed','historical'], defaultValue: 'not-configured' },
        { name: 'source', type: 'text' },
        { name: 'legacyId', type: 'text', unique: true },
        { name: 'submitterKey', type: 'text', index: true, hidden: true },
      ],
    },
  ],
})
