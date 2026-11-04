import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
await mkdir('.data', { recursive: true })
try {
  await writeFile('.env', `PAYLOAD_SECRET=${randomBytes(48).toString('hex')}\nSQLITE_URL=file:.data/pci.sqlite\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\nSITE_INDEXABLE=false\n`, { flag: 'wx' })
} catch (err) {
  if (err.code !== 'EEXIST') throw err
}
