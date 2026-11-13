'use client'

import { useEffect, useId, useState } from 'react'
import type { SpecificationTable } from '@/content/product-details'
import styles from './product-detail.module.css'

const pageSize = 12

export function ProductSpecifications({ tables }: { tables: SpecificationTable[] }) {
  const id = useId()
  const [ready, setReady] = useState(false)
  const [tableId, setTableId] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  useEffect(() => setReady(true), [])

  const search = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const entries = tables.flatMap(table => table.rows.map((row, index) => ({ table, row, key: `${table.id}-${index}` })))
  const filtered = entries.filter(({ table, row }) => {
    const values = row.map((value, index) => `${value}${table.columns[index].unit}`).join(' ')
    const text = `${table.title} ${values}`.toLocaleLowerCase().replace(/\s+/g, '')
    return (tableId === 'all' || table.id === tableId) && search.every(term => text.includes(term))
  })
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const visible = ready ? filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize) : filtered
  function reset() {
    setTableId('all')
    setQuery('')
    setPage(1)
  }

  return <div className={styles.directory}>
    <form className={styles.filters} hidden={!ready} onSubmit={event => event.preventDefault()} role="search" aria-label="Product specifications">
      <div>
        <label htmlFor={`${id}-table`}>Standard or construction</label>
        <select id={`${id}-table`} value={tableId} onChange={event => { setTableId(event.target.value); setPage(1) }}>
          <option value="all">All catalogue tables</option>
          {tables.map(table => <option key={table.id} value={table.id}>{table.title}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-search`}>Find a size or code word</label>
        <input id={`${id}-search`} type="search" value={query} placeholder="Code word, area, diameter…" onChange={event => { setQuery(event.target.value); setPage(1) }} />
      </div>
      <button className={styles.reset} type="button" onClick={reset}>Clear filters</button>
    </form>

    <p className={styles.resultCount} role="status" aria-live="polite" aria-atomic="true">
      {filtered.length === 0 ? 'No matching entries' : ready ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length} entries` : `${filtered.length} catalogue entries`}
      <span>Open an entry for the complete specification.</span>
    </p>

    <div className={styles.entries}>
      {visible.map(({ table, row, key }) => <details key={key} className={styles.entry} data-spec-entry="">
        <summary>
          <span className={styles.entryName}>
            <small>{table.title}</small>
            <strong>{row[0]} {table.columns[0].unit && <span>{table.columns[0].unit}</span>}</strong>
          </span>
          {table.summaryColumns.map(index => <span className={styles.entryMetric} key={index}>
            <small>{table.columns[index].label}</small>
            <span>{row[index]} <small>{table.columns[index].unit}</small></span>
          </span>)}
          <span className={styles.expandHint}>Full details <span aria-hidden="true">+</span></span>
        </summary>
        <div className={styles.entryBody}>
          <p className={styles.entryStandard}>{table.title}</p>
          <dl className={styles.parameters}>
            {table.columns.map((column, index) => <div key={index}>
              <dt>{column.label}</dt>
              <dd>{row[index]} {column.unit && <span>{column.unit}</span>}</dd>
            </div>)}
          </dl>
          {table.note && <p className={styles.sourceNote}>{table.note}</p>}
          <a className={styles.sourceLink} href={`/media/${table.source}#page=${table.page}`} target="_blank" rel="noopener noreferrer">View {table.source === 'catalogue.pdf' ? 'catalogue' : 'MVCC datasheet'} page {table.page} <span aria-hidden="true">↗</span></a>
        </div>
      </details>)}
    </div>

    {filtered.length === 0 && <div className={styles.empty}>
      <h3>No specification matches those filters.</h3>
      <p>Try a different size or code word, or search across all catalogue tables.</p>
      <button type="button" onClick={reset}>Show all entries</button>
    </div>}

    <nav className={styles.pagination} hidden={!ready || pages <= 1} aria-label="Specification pages">
      <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← Previous</button>
      <span>Page {currentPage} of {pages}</span>
      <button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next →</button>
    </nav>
    <p className={styles.dataBasis}>Values follow PCI’s published tables, including their decimal precision. A dash indicates an unlisted value. Catalogue specifications and site conditions should be confirmed with PCI for the selected order.</p>
  </div>
}
