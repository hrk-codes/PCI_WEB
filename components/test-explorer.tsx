'use client'

import { useState } from 'react'
import { testFamilies, tests, type TestFamily } from '@/content/capabilities'
import styles from './capabilities.module.css'

/** Line icons for the four test families. */
export function FamilyIcon({ family }: { family: TestFamily }) {
  const paths: Record<TestFamily, React.ReactNode> = {
    conductor: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="6.6" r="2.4"/><circle cx="12" cy="17.4" r="2.4"/><circle cx="7.3" cy="9.3" r="2.4"/><circle cx="16.7" cy="9.3" r="2.4"/><circle cx="7.3" cy="14.7" r="2.4"/><circle cx="16.7" cy="14.7" r="2.4"/></>,
    electrical: <path d="M13.5 2.5 5 13.5h6l-1.5 8 8.5-11h-6l1.5-8Z"/>,
    insulation: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.6"/><path d="M12 9.4v5.2M9.4 12h5.2"/></>,
    fire: <path d="M12 21.5c-4 0-6.6-2.7-6.6-6.3 0-3.4 2.4-5.4 3.6-8.2.5 2 1.6 3 2.6 3.4-.3-3 1-5.9 3.6-7.9-.3 3 2.9 5.6 3.4 9 .6 4.7-2.3 10-6.6 10Zm0 0c-1.7 0-2.8-1.2-2.8-2.8 0-1.8 1.6-2.6 2.2-4.2 1.5 1.2 3.4 2.4 3.4 4.4 0 1.5-1.2 2.6-2.8 2.6Z"/>,
  }
  return <svg className={styles.familyIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[family]}</svg>
}

/** Filterable list of the 25 in-house tests. Without JavaScript every test is listed. */
export function TestExplorer() {
  const [family, setFamily] = useState<TestFamily | 'all'>('all')
  const shown = tests.filter(test => family === 'all' || test.family === family)
  const families = Object.entries(testFamilies) as [TestFamily, typeof testFamilies[TestFamily]][]
  return <div className={styles.explorer}>
    <div className={styles.filters} role="group" aria-label="Filter tests by family">
      <button type="button" aria-pressed={family === 'all'} onClick={() => setFamily('all')}>All tests <b>{tests.length}</b></button>
      {families.map(([id, f]) => <button type="button" key={id} data-family={id} aria-pressed={family === id} onClick={() => setFamily(id)}>
        <FamilyIcon family={id}/>{f.name} <b>{tests.filter(test => test.family === id).length}</b>
      </button>)}
    </div>
    <p className={styles.filterNote} aria-live="polite">{family === 'all' ? `All ${tests.length} tests in PCI’s laboratory, numbered as in our published list.` : `${shown.length} ${testFamilies[family].name.toLowerCase()} tests: ${testFamilies[family].text}`}</p>
    <ol className={styles.testGrid}>
      {tests.map(test => <li key={test.no} data-family={test.family} hidden={family !== 'all' && test.family !== family}>
        <div className={styles.testTop}><span className={styles.testNo}>{String(test.no).padStart(2, '0')}</span><span className={styles.testFamily}><FamilyIcon family={test.family}/>{testFamilies[test.family].short}</span></div>
        <h3>{test.name}</h3>
        <p>{test.proves}</p>
      </li>)}
    </ol>
  </div>
}
