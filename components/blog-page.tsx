import Image from 'next/image'
import Link from 'next/link'
import { articles, editedMany } from '@/lib/content'
import { newsBrief } from '@/content/news-brief'
import { Arrow, Kicker } from './site'
import { articleImages } from './catalogue'
import { VideoCard, type BlogVideo } from './blog-videos'
import styles from './blog-page.module.css'

/**
 * Blog: the latest story featured, the interview videos, then PCI's news in brief, year by year (older stories are linked from their items).
 */
const summaries: Record<string, string> = {
  'pci-have-participated-at-elecrama-2025': 'PCI Cables Industries took its cables, conductors and earth wire to ELECRAMA 2025 at India Expo Mart, Greater Noida, meeting engineers, utilities, EPC companies and international buyers.',
}
/** The interview videos from the original Press Releases page, saved for streaming in public/media/blog/. */
const videos: BlogVideo[] = [
  { src: '/media/blog/elecrama-2025-interview.mp4', poster: '/media/blog/elecrama-2025-interview.webp', title: 'Exclusive interview at ELECRAMA 2025', by: 'Ranjeet Kumar, AVP Sales & BD', length: '3:26' },
  { src: '/media/blog/ep-info-interview.mp4', poster: '/media/blog/ep-info-interview.webp', title: 'In conversation with E&P Info', by: 'Ranjeet Kumar, AVP Sales & BD', length: '4:40' },
  { src: '/media/blog/era-fame-feature.mp4', poster: '/media/blog/era-fame-feature.webp', title: 'India’s cable and conductor maker', by: 'Era Fame Media Group', length: '0:44', vertical: true },
]
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const minutes = (html: string) => Math.max(1, Math.round(html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 200))

export async function BlogPage() {
  const titles = await editedMany(articles.map(doc => doc.slug))
  const posts = articles.map(doc => ({
    slug: doc.slug, date: doc.date, href: `/blog/${doc.slug}/`, title: titles.get(doc.slug)?.title || doc.title, read: minutes(doc.html),
    summary: summaries[doc.slug] || doc.summary, image: `/media/${articleImages[doc.slug]}`,
  }))
  const [featured] = posts
  const storyHref = Object.fromEntries(posts.map(post => [post.slug, post.href]))
  const count = newsBrief.reduce((sum, year) => sum + year.items.length, 0)

  return <div className={styles.blog}>
    {featured && <article className={styles.featured}>
      <Link href={featured.href} className={styles.featuredImage} tabIndex={-1} aria-hidden="true">
        <Image src={featured.image} alt="" fill sizes="(max-width: 860px) 100vw, 55vw" preload/>
        <span className={styles.flag}>Latest story</span>
      </Link>
      <div className={styles.featuredText}>
        <p className={styles.meta}><time dateTime={featured.date}>{day(featured.date)}</time><span>{featured.read} min read</span></p>
        <h2><Link href={featured.href}>{featured.title}</Link></h2>
        <p>{featured.summary}</p>
        <Link className={styles.more} href={featured.href}>Read the story <Arrow/></Link>
      </div>
    </article>}

    <section className={styles.videos} aria-labelledby="blog-videos">
      <div className={styles.videosHead}>
        <div><Kicker>On video</Kicker><h2 id="blog-videos">PCI in the media.</h2></div>
        <p>Interviews with Ranjeet Kumar, AVP Sales &amp; Business Development, at ELECRAMA 2025, and a short feature by Era Fame Media Group.</p>
      </div>
      <div className={styles.videoRow}>
        {videos.map(video => <VideoCard key={video.src} video={video}/>)}
      </div>
    </section>

    <section className={styles.brief} aria-labelledby="news-brief">
      <div className={styles.briefHead}>
        <div><Kicker>News in brief</Kicker><h2 id="news-brief">{count} milestones since 2022.</h2></div>
        <ul className={styles.legend} aria-label="Item types">{['Order', 'Delivered', 'Export', 'Event'].map(kind => <li key={kind} data-kind={kind}>{kind}</li>)}</ul>
      </div>
      <div className={styles.years}>
        {newsBrief.map(({ year, items }) => <section key={year} className={styles.year} aria-labelledby={`brief-${year}`}>
          <h3 id={`brief-${year}`}>{year}<small>{items.length}</small></h3>
          <ol>
            {items.map(item => <li key={item.title} data-kind={item.kind}>
              <span className={styles.when}>{item.month || year}</span>
              <div>
                <span className={styles.kind}>{item.kind}</span>
                <b>{item.story && storyHref[item.story] ? <Link href={storyHref[item.story]}>{item.title}</Link> : item.title}</b>
              </div>
            </li>)}
          </ol>
        </section>)}
      </div>
    </section>
  </div>
}
