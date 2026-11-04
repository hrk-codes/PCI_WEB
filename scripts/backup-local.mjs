import { DatabaseSync } from 'node:sqlite'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
const db = process.env.SQLITE_URL || 'file:.data/pci.sqlite'
if (process.env.DATABASE_URL || !db.startsWith('file:')) throw new Error('Use the database provider’s backup system for PostgreSQL.')
const target = resolve('.data/backups/pci-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite')
await mkdir('.data/backups',{recursive:true})
const connection = new DatabaseSync(db.slice(5),{readOnly:true})
try {
  connection.prepare('VACUUM INTO ?').run(target)
  console.log('Private backup created: '+target)
} finally { connection.close() }
