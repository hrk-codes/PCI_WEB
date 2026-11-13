// Replaces cut-off imported summaries and all-caps titles with the clean copy in content/page-copy.json.
// Only unfinished summaries (no closing punctuation) and all-caps titles are touched, so staff edits are kept.
// Usage: node --env-file-if-exists=.env scripts/fix-page-copy.mjs [--dry-run]
import { getPayload } from 'payload'
import { readFile } from 'node:fs/promises'
import config from '../payload.config.ts'

const copy = JSON.parse(await readFile('content/page-copy.json', 'utf8'))
const dry = process.argv.includes('--dry-run')
const payload = await getPayload({ config })
const unfinished = text => !!text && !/[.!?)”"]\s*$/.test(text.trim())
const shouting = text => !!text && /[A-Z]{3}/.test(text) && text === text.toUpperCase()
let changed = 0
for (const [slug, entry] of Object.entries(copy)) {
  if (slug.startsWith('_')) continue
  const { docs } = await payload.find({ collection: 'site-content', where: { slug: { equals: slug } }, limit: 1 })
  const doc = docs[0]
  if (!doc) continue
  const data = {}
  if (entry.summary && unfinished(doc.summary)) data.summary = entry.summary
  if (entry.title && shouting(doc.title)) data.title = entry.title
  if (!Object.keys(data).length) continue
  changed++
  console.log(`${dry ? 'would update' : 'updated'} ${slug}: ${Object.keys(data).join(', ')}`)
  if (!dry) await payload.update({ collection: 'site-content', id: doc.id, data })
}
console.log(`${changed} page${changed === 1 ? '' : 's'} ${dry ? 'need' : 'received'} clean copy.`)
await payload.destroy()
process.exit(0)
