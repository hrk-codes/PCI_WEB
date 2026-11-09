'use client'

import { useState, type MouseEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './client-directory.module.css'

const pageSize = 12

type DirectoryRow = { name: string; sector: string }

export function ClientDirectoryResults({ results, query, sector }: {
  results: DirectoryRow[]
  query: string
  sector?: string
}) {
  const searchParams = useSearchParams()
  const [hasPaged, setHasPaged] = useState(false)
  const pages = Math.max(1, Math.ceil(results.length / pageSize))
  const requestedPage = Number(searchParams.get('page') ?? '1')
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1, Math.min(requestedPage, pages)) : 1
  const offset = (page - 1) * pageSize
  const rows = results.slice(offset, offset + pageSize)

  function pageHref(next: number) {
    if (next < 1 || next > pages) return undefined
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (sector) params.set('sector', sector)
    if (next > 1) params.set('page', String(next))
    return `/clients/${params.size ? '?' + params.toString() : ''}#client-directory`
  }

  function paginate(event: MouseEvent<HTMLAnchorElement>) {
    const link = event.currentTarget
    if (!link.hasAttribute('href') || event.defaultPrevented || event.button !== 0 ||
        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

    event.preventDefault()
    window.history.pushState(null, '', link.href)
    setHasPaged(true)
  }

  const previous = pageHref(page - 1)
  const next = pageHref(page + 1)

  return (
    <>
      <p className={styles.resultCount} role="status">
        Showing {offset + 1}–{offset + rows.length} of {results.length} entries
      </p>
      <table className={styles.table} aria-label="PCI client directory">
        <thead><tr><th scope="col">Organisation</th><th scope="col">Sector</th></tr></thead>
        <tbody key={page} className={hasPaged ? styles.pageRows : undefined}>
          {rows.map(({ name, sector }) => (
            <tr key={`${sector}-${name}`}><th scope="row">{name}</th><td>{sector}</td></tr>
          ))}
        </tbody>
      </table>

      {pages > 1 && (
        <nav className={styles.pagination} aria-label="Client directory pages">
          <a href={previous} rel="prev" onClick={paginate} role="link" aria-disabled={!previous || undefined} tabIndex={previous ? 0 : -1}>
            <span aria-hidden="true">←</span> Previous
          </a>
          <p>Page {page} of {pages}</p>
          <a href={next} rel="next" onClick={paginate} role="link" aria-disabled={!next || undefined} tabIndex={next ? 0 : -1}>
            Next <span aria-hidden="true">→</span>
          </a>
        </nav>
      )}
    </>
  )
}
