import { getPayload } from 'payload'
import config from '../payload.config.ts'
const { PCI_STAFF_EMAIL:email, PCI_STAFF_PASSWORD:password } = process.env
if (!email || !password || password.length<16) throw new Error('Set PCI_STAFF_EMAIL and a unique PCI_STAFF_PASSWORD (at least 16 characters) in the process environment.')
const cms = await getPayload({ config })
try {
  if ((await cms.count({ collection:'staff', where:{email:{equals:email}} })).totalDocs) throw new Error('A staff account already uses that email.')
  await cms.create({ collection:'staff', data:{ email, password }, overrideAccess:true })
  console.log('Staff account created.')
} finally { await cms.destroy() }
