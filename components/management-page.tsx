import type { CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { leaderGroups, leaders, type Leader } from '@/content/management'
import { Arrow, Kicker } from './site'
import { CapabilityMotion } from './capability-motion'
import styles from './management-page.module.css'

/**
 * Management: PCI's board and senior management. A navy stage with the leadership structure, the leaders as
 * monogram cards (a portrait replaces the monogram once `photo` is set in content/management.ts) and the
 * teams a visitor can reach directly.
 */
const d = (i: number) => ({ '--d': i } as CSSProperties)
const byId = Object.fromEntries(leaders.map(leader => [leader.id, leader])) as Record<string, Leader>

const teams = [
  { name: 'Sales & marketing', note: 'Quotations, specifications and orders', phones: ['+91 99903 01351', '+91 90622 07003'] },
  { name: 'Purchase', note: 'Vendors and supply partners', phones: ['+91 90622 07005'] },
  { name: 'Human resources', note: 'Careers at PCI', phones: ['+91 90622 07010'] },
]
/** The office landline, for any other question. */
const landline = '+91 3212 230691'
const tel = (phone: string) => 'tel:' + phone.replace(/\s/g, '')

/** A conductor seen end-on: one centre wire, six around it and twelve around those. */
function Strands({ className }: { className: string }) {
  const ring = (count: number, radius: number) => Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2
    return <circle key={`${count}-${i}`} cx={(50 + Math.cos(a) * radius).toFixed(2)} cy={(50 + Math.sin(a) * radius).toFixed(2)} r="7.6"/>
  })
  return <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <circle cx="50" cy="50" r="46" className={styles.strandSheath}/>
    <circle cx="50" cy="50" r="7.6"/>{ring(6, 15.4)}{ring(12, 30.6)}
  </svg>
}

/** The small round badge in the structure: the leader's face, or their initials until a portrait exists. */
function NodeMark({ leader }: { leader: Leader }) {
  return <span className={styles.nodeMark} aria-hidden="true">
    {leader.photo ? <Image src={leader.photo} alt="" width={84} height={84} sizes="42px" className={styles.nodePhoto}/> : leader.initials}
  </span>
}

/** The chain of responsibility, drawn as a live line diagram: the "current" flows from the chairman down through the
 *  managing director to sales and business development. */
function Structure() {
  const nodes: [Leader, number][] = [[byId.chairman, 14], [byId['managing-director'], 50], [byId['avp-sales'], 86]]
  const wires = 'M50 23 V41 M50 59 V77'
  return <figure className={styles.structure}>
    <svg className={styles.wires} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className={styles.wireBase} d={wires}/>
      <path className={styles.wireCurrent} d={wires}/>
    </svg>
    {[32, 68].map(y => <span key={y} className={styles.junction} style={{ top: `${y}%` }} aria-hidden="true"/>)}
    <ul aria-label="Leadership structure">
      {nodes.map(([leader, y], i) => <li key={leader.id} className={leader.id === 'chairman' ? styles.nodeLead : styles.node} style={{ '--x': '50%', '--y': `${y}%`, '--d': i } as CSSProperties}>
        <NodeMark leader={leader}/>
        <span><small>{leader.short}</small><b>{leader.honorific} {leader.name}</b></span>
      </li>)}
    </ul>
    <figcaption>Leadership structure of PCI Cables Industries Pvt. Ltd.</figcaption>
  </figure>
}

/**
 * An editorial portrait: the studio photograph fills the navy panel, its grey backdrop toned into PCI navy at the edges,
 * while the panel's artwork (grid and conductor strands) is laid over the margins and fades out before the face.
 */
function LeaderCard({ leader, index }: { leader: Leader; index: number }) {
  return <li className={styles.card} data-reveal style={d(index)}>
    <div className={styles.portrait}>
      {leader.photo
        ? <div className={styles.photoFrame}>
          <Image src={leader.photo} alt={`${leader.honorific} ${leader.name}, ${leader.role}, PCI Cables`} fill sizes="(max-width: 620px) 130px, (max-width: 820px) 220px, 32vw" className={styles.photo}/>
        </div>
        : <span className={styles.cardMark} aria-hidden="true">{leader.initials}</span>}
      <span className={styles.portraitArt} aria-hidden="true"/>
      <Strands className={styles.strands}/>
      <span className={styles.corner} aria-hidden="true"/>
      <span className={styles.group}>{leaderGroups[leader.group]}</span>
      <span className={styles.index} aria-hidden="true">0{index + 1}</span>
    </div>
    <div className={styles.cardBody}>
      <span className={styles.honorific}>{leader.honorific}</span>
      <h3>{leader.name}</h3>
      <p className={styles.role}>{leader.role}</p>
      <p className={styles.groupLine}>{leaderGroups[leader.group]}</p>
    </div>
  </li>
}

export function ManagementPage({ title, intro }: { title: string; intro: string }) {
  return <div className={styles.page} data-capability data-management>
    <CapabilityMotion/>
    <header className={styles.hero}>
      <div className={styles.heroGrid} aria-hidden="true"/>
      <div className={`wrap ${styles.heroLayout}`}>
        <div className={styles.heroCopy}>
          <div className="breadcrumbs"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Company</span><span aria-hidden="true">/</span><span>{title}</span></div>
          <Kicker>Company · {title}</Kicker>
          <h1>Led from Dankuni, <span className={styles.accent}>since 2013</span>.</h1>
          <p>{intro}</p>
          <div className={styles.heroActions}>
            <a className="button" href="#leadership">Meet our leadership <Arrow/></a>
            <Link className={styles.ghost} href="/about-us/">About PCI <Arrow diagonal/></Link>
          </div>
        </div>
        <Structure/>
      </div>
    </header>

    <section id="leadership" className={styles.band} aria-labelledby="leadership-title">
      <div className={`wrap ${styles.leadWrap}`}>
        <div className={styles.heading} data-reveal>
          <div><Kicker>Leadership</Kicker><h2 id="leadership-title">Meet our leadership.</h2></div>
          <p>The board of directors and senior management of PCI Cables Industries Pvt. Ltd., guiding our manufacturing, sales and business development.</p>
        </div>
        <ol className={styles.cards}>
          {leaders.map((leader, i) => <LeaderCard key={leader.id} leader={leader} index={i}/>)}
        </ol>
      </div>
    </section>

    <section className={styles.closing} aria-labelledby="management-contact">
      <div className={`wrap ${styles.closingInner}`}>
        <div data-reveal>
          <Kicker>Reach the right team</Kicker>
          <h2 id="management-contact">Talk to the people who can help.</h2>
          <p>Our teams in Dankuni answer directly. Write to <a href="mailto:info@pcicablesindustries.com">info@pcicablesindustries.com</a> or call the team you need.</p>
          <div className={styles.closingActions}>
            <Link className="button" href="/request-quote/">Request a quote <Arrow/></Link>
            <Link className={styles.ghost} href="/contact-us/">Contact details <Arrow diagonal/></Link>
          </div>
        </div>
        <ul className={styles.teams}>
          {teams.map((team, i) => <li key={team.name} data-reveal style={d(i)}>
            <span className={styles.teamName}>{team.name}</span>
            <span className={styles.teamNote}>{team.note}</span>
            <span className={styles.teamPhones}>{team.phones.map(phone => <a key={phone} href={tel(phone)}>{phone}</a>)}</span>
          </li>)}
          <li className={styles.landline} data-reveal style={d(teams.length)}>
            <svg className={styles.landlineIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>
            <span className={styles.landlineText}><span className={styles.teamName}>For further queries</span><span className={styles.teamNote}>Our office landline in Dankuni, for anything else you need</span></span>
            <a href={tel(landline)}><small>Landline</small>{landline}</a>
          </li>
        </ul>
      </div>
    </section>
  </div>
}
