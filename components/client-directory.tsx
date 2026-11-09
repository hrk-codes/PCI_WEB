import type { ReactNode } from 'react'
import directory from '@/content/client-directory.json'
import { ClientDirectoryResults } from './client-directory-results'
import { Clients } from './interactions'
import { Kicker } from './site'
import styles from './client-directory.module.css'

const sectors = {
  utilities: 'Utilities',
  'rail-public': 'Rail & public sector',
  international: 'International',
  renewables: 'Renewables',
} as const

type Sector = keyof typeof sectors
const sectorIds = Object.keys(sectors) as Sector[]
const queryLimit = 100
const directoryAnchor = '/clients/#client-directory'

const alternateNames: Partial<Record<string, string>> = {
  APDCL: 'Assam Power Distribution Company',
  WBSEDCL: 'West Bengal State Electricity Distribution Company',
  RVNL: 'Rail Vikas Nigam',
  'Bangaluru Metro': 'Bengaluru Bangalore Metro',
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

const collator = new Intl.Collator('en-IN', { sensitivity: 'base', numeric: true })
const entries = sectorIds.flatMap(sector => directory[sector].map(name => ({
  name,
  sector,
  searchable: normalize(`${name} ${alternateNames[name] ?? ''}`),
}))).sort((a, b) => collator.compare(a.name, b.name))

type SearchParams = Record<string, string | string[] | undefined>
function first(value: SearchParams[string]) {
  return Array.isArray(value) ? value[0] : value
}

export function ClientDirectory({ filters, children }: { filters: SearchParams; children?: ReactNode }) {
  const query = (first(filters.q) ?? '').trim().slice(0, queryLimit)
  const sectorParam = first(filters.sector)
  const sector = sectorIds.find(id => id === sectorParam)
  const terms = normalize(query).split(' ').filter(Boolean)
  const results = entries.filter(entry => (!sector || entry.sector === sector) &&
    terms.every(term => entry.searchable.includes(term)))

  return (
    <>
      <section className={styles.showcase} aria-labelledby="client-logos-heading">
        <header className={styles.showcaseHeading}>
          <h2 id="client-logos-heading">Client logos</h2>
          <a className={styles.jump} href="#client-directory">Search the client directory <span aria-hidden="true">↓</span></a>
        </header>
        <Clients all />
      </section>

      <section className={styles.directory} aria-labelledby="client-directory">
        <header className={styles.directoryHeading}>
          <Kicker>Find an organisation</Kicker>
          <h2 id="client-directory" tabIndex={-1}>Client directory</h2>
          <p>Search the published client list by name or acronym, or choose a sector.</p>
        </header>

        <form className={styles.filters} action={directoryAnchor} method="get">
          <label>
            Search organisations
            <input type="search" name="q" defaultValue={query} maxLength={queryLimit} placeholder="Name or acronym, e.g. RVNL" />
          </label>
          <label>
            Sector
            <select name="sector" defaultValue={sector ?? ''}>
              <option value="">All sectors</option>
              {sectorIds.map(id => <option key={id} value={id}>{sectors[id]}</option>)}
            </select>
          </label>
          <div className={styles.filterActions}>
            <button className="button" type="submit">Search</button>
            <a href={directoryAnchor}>Clear filters</a>
          </div>
        </form>

        {results.length > 0 ? (
          <ClientDirectoryResults
            results={results.map(entry => ({ name: entry.name, sector: sectors[entry.sector] }))}
            query={query}
            sector={sector}
          />
        ) : (
          <>
            <p className={styles.resultCount}>No matching organisations</p>
            <div className={styles.empty}>
              <p>Try another name or select All sectors.</p>
              <a href={directoryAnchor}>Reset directory</a>
            </div>
          </>
        )}

        {children && (
          <details className={styles.additional}>
            <summary>Additional client information</summary>
            {children}
          </details>
        )}
      </section>
    </>
  )
}
