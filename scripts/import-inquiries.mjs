import { getPayload } from 'payload'
import { readFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import config from '../payload.config.ts'
const filename = process.argv[2]
if (!filename) throw new Error('Pass a normalized JSON export stored outside the repository.')
const inside = relative(process.cwd(),resolve(filename))
if (!inside.startsWith('..')) throw new Error('Keep the private export outside the repository.')
const rows = JSON.parse(await readFile(filename,'utf8'))
if (!Array.isArray(rows)) throw new Error('Expected a JSON array.')
const limits = { legacyId:150, name:100, email:200, phone:24, company:160, message:3000 }
for (let i=0; i<rows.length; i++) {
  const row = rows[i]
  if (!row || !['quote','contact','career','vendor'].includes(row.kind) ||
      !row.legacyId || !row.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email || '') || !row.message ||
      Object.entries(limits).some(([key,max]) => row[key] != null && (typeof row[key]!=='string' || row[key].length>max))) {
    throw new Error('Invalid record at row '+(i+1)+'. No rows imported.')
  }
}
const cms = await getPayload({ config })
let added = 0
try {
  for (const row of rows) {
    if ((await cms.count({ collection:'inquiries',where:{legacyId:{equals:row.legacyId}} })).totalDocs) continue
    const { kind, legacyId, name, email, phone, company, message } = row
    await cms.create({ collection:'inquiries',overrideAccess:true,data:{kind,legacyId,name,email,phone,company,message,status:'closed',emailStatus:'historical',source:'legacy-import'} })
    added++
  }
  console.log('Imported '+added+' historical records; '+(rows.length-added)+' already existed.')
} finally { await cms.destroy() }
