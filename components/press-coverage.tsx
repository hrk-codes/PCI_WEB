import { statSync } from 'node:fs'
import { join } from 'node:path'
import Image from 'next/image'
import { Arrow, Kicker } from './site'
import styles from './press-coverage.module.css'

/**
 * Press releases: PCI's interviews in Electrical & Power Info, shown as the magazine pages themselves (rendered from the
 * PDFs into public/media/press/) with the issue, the leader interviewed and what the interview covers.
 */
const issues = [
  {
    issue: 'October–November 2025', volume: 'Vol. 15 · Issue 4', page: 6, pdf: '/media/2025-12-ep-info-oct-nov-2025-1.pdf', sheet: '/media/press/ep-info-oct-nov-2025.webp',
    name: 'Ranjeet Kumar', role: 'AVP, Sales & Business Development', photo: '/media/leadership/ranjeet-kumar.webp',
    topics: ['₹275 crore turnover in 2024–25', 'Exports to Mozambique and the Philippines', 'MVCC and HTLS conductors'],
  },
  {
    issue: 'February–March 2025', volume: 'Vol. 14 · Issue 6', page: 30, pdf: '/media/2025-12-ep-info-feb-mar-2025.pdf', sheet: '/media/press/ep-info-feb-mar-2025.webp',
    name: 'Prakash Jha', role: 'Managing Director', photo: '/media/leadership/prakash-jha.webp',
    topics: ['Railway electrification order', 'Exports to Guinea and Liberia', 'Plans for a BSE listing'],
  },
  {
    issue: 'October–November 2024', volume: 'Vol. 14 · Issue 5', page: 8, pdf: '/media/2025-12-ep-info-oct-nov-2024-1.pdf', sheet: '/media/press/ep-info-oct-nov-2024.webp',
    name: 'Ranjeet Kumar', role: 'AVP, Sales & Business Development', photo: '/media/leadership/ranjeet-kumar.webp',
    topics: ['Demand from TBCB and RDSS projects', 'Orders booked for 2025–26', 'Plans for a BSE listing'],
  },
]

function size(href: string) {
  try { return `${(statSync(join(process.cwd(), 'public', href)).size / 1048576).toFixed(1)} MB` } catch { return '' }
}

export function PressCoverage() {
  return <div className={styles.press}>
    <div className={styles.intro}>
      <div>
        <Kicker>In the press</Kicker>
        <h2>Interviews in <em>Electrical &amp; Power Info</em>.</h2>
      </div>
      <p>The trade magazine has interviewed PCI’s leadership in three issues across 2024 and 2025, on our products, our order book and the plans ahead. Each interview opens as a PDF.</p>
    </div>

    <ol className={styles.issues}>
      {issues.map((item, i) => {
        const pdfSize = size(item.pdf)
        return <li key={item.pdf} className={styles.issue}>
          <a className={styles.desk} href={item.pdf} target="_blank" rel="noopener" aria-label={`Read the interview with ${item.name}, ${item.issue} (PDF${pdfSize ? `, ${pdfSize}` : ''})`}>
            <span className={styles.sheet}>
              <Image src={item.sheet} alt="" width={820} height={1061} sizes="(max-width: 620px) 70vw, (max-width: 1000px) 30vw, 300px"/>
            </span>
            {i === 0 && <span className={styles.latest}>Latest</span>}
            <span className={styles.open} aria-hidden="true"><Arrow diagonal/></span>
          </a>
          <div className={styles.info}>
            <p className={styles.issueLine}><time>{item.issue}</time><span>{item.volume} · p. {item.page}</span></p>
            <div className={styles.person}>
              <Image src={item.photo} alt="" width={96} height={96} className={styles.avatar}/>
              <div><h3>Interview with {item.name}</h3><p>{item.role}</p></div>
            </div>
            <ul className={styles.topics} aria-label="Covered in this interview">
              {item.topics.map(topic => <li key={topic}>{topic}</li>)}
            </ul>
          </div>
        </li>
      })}
    </ol>

    <p className={styles.note}>For media enquiries, write to <a href="mailto:info@pcicablesindustries.com">info@pcicablesindustries.com</a>.</p>
  </div>
}
