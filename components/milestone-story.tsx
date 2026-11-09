import type { ReactNode } from 'react'
import Link from 'next/link'
import { milestoneChapters, type MilestoneImage } from '@/content/milestones'
import { Arrow, Kicker, Picture, TextLink } from './site'
import styles from './milestone-story.module.css'

const companyLinks = [
  ['About PCI', '/about-us/'],
  ['Management', '/management/'],
  ['Certifications', '/certificates/'],
  ['Clients', '/clients/'],
  ['Turnover', '/turnover/'],
]

function StoryImage({ image }: { image: MilestoneImage }) {
  return (
    <figure className={styles.figure}>
      <div className={`${styles.frame} ${styles[image.fit]}`}>
        <Picture src={`/media/${image.file}`} alt={image.alt} sizes="(max-width: 899px) 90vw, 34vw" />
      </div>
      <figcaption>{image.caption}</figcaption>
    </figure>
  )
}

export function MilestoneStory({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return (
    <div className={styles.story}>
      <header className={styles.hero}>
        <div className={`wrap ${styles.heroLayout}`}>
          <div className={styles.heroCopy}>
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Milestones</span>
            </nav>
            <Kicker>Our journey</Kicker>
            <h1>{title}</h1>
            <p>{intro}</p>
            <a className={styles.start} href="#foundations">Start the story <span aria-hidden="true">↓</span></a>
          </div>
          <figure className={`${styles.figure} ${styles.heroFigure}`}>
            <div className={styles.heroImage}>
              <Picture src="/media/plant.webp" alt="PCI Cables works in Dankuni, West Bengal" priority sizes="(max-width: 899px) 90vw, 47vw" />
            </div>
            <figcaption>PCI Cables works · Dankuni, West Bengal</figcaption>
          </figure>
        </div>
      </header>

      <div className={`wrap ${styles.layout}`}>
        <nav className={styles.index} aria-label="In this story">
          <p>In this story</p>
          <ul role="list">
            {milestoneChapters.map(chapter => (
              <li key={chapter.id}>
                <a href={`#${chapter.id}`}><strong>{chapter.years}</strong><span>{chapter.title}</span></a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.chapters}>
          {milestoneChapters.map(chapter => (
            <section className={styles.chapter} key={chapter.id} id={chapter.id} tabIndex={-1} aria-labelledby={`${chapter.id}-title`}>
              <header className={styles.chapterHeading}>
                <Kicker>{chapter.years}</Kicker>
                <h2 id={`${chapter.id}-title`}>{chapter.title}</h2>
                <p>{chapter.intro}</p>
              </header>
              <div className={styles.chapterBody}>
                <ol className={styles.events} role="list">
                  {chapter.events.map(event => (
                    <li key={`${event.date}-${event.title}`}>
                      <time dateTime={event.date}>{event.dateLabel}</time>
                      <h3>{event.title}</h3>
                      <p>{event.description}</p>
                      {event.link && <TextLink href={event.link.href}>{event.link.label}</TextLink>}
                    </li>
                  ))}
                </ol>
                {chapter.images ? (
                  <div className={styles.visuals}>
                    {chapter.images.map(image => <StoryImage key={image.file} image={image} />)}
                  </div>
                ) : chapter.id === 'first-exports' && (
                  <div className={styles.exports} aria-hidden="true">
                    <p>First export destinations</p>
                    <div className={styles.exportLine}>
                      <div><strong>Uganda</strong><span>Conductors · June</span></div>
                      <div><strong>Nepal</strong><span>Cables · October</span></div>
                    </div>
                    <small>2022 · Export milestones</small>
                  </div>
                )}
              </div>
            </section>
          ))}

          {children && (
            <details className={styles.additional}>
              <summary>Additional company information</summary>
              {children}
            </details>
          )}

          <section className={styles.more} aria-labelledby="milestone-more">
            <h2 id="milestone-more">Continue exploring PCI.</h2>
            <div className={styles.actions}>
              <Link className="button" href="/products/">Explore our products <Arrow diagonal /></Link>
              <TextLink href="/news/">Read PCI news</TextLink>
            </div>
            <nav className={styles.related} aria-label="About the company">
              {companyLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
            </nav>
          </section>
        </div>
      </div>
    </div>
  )
}
