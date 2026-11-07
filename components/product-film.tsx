import Link from 'next/link'
import { AluminiumCableFeature } from '@/components/aluminium-cable-feature'
import { Arrow, Kicker } from '@/components/site'
import { ProductFilmReveal } from './product-film-reveal'
import styles from './product-film.module.css'

export function ProductFilm({ productCount }: { productCount: number }) {
  return (
    <section className={`section ${styles.scene}`} aria-labelledby="product-film-heading">
      <svg className={styles.transition} viewBox="0 0 1440 112" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="product-film-trace">
            <stop stopColor="#ff8e61" stopOpacity="0" />
            <stop offset=".25" stopColor="#ff8e61" stopOpacity=".3" />
            <stop offset=".55" stopColor="#ffad83" stopOpacity=".85" />
            <stop offset=".78" stopColor="#ff8e61" stopOpacity=".35" />
            <stop offset="1" stopColor="#ff8e61" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#product-film-trace)">
          <path d="M0 20H430C545 20 550 64 665 64H1440" vectorEffect="non-scaling-stroke" />
          <path d="M0 28H406C530 28 538 74 662 74H1440" opacity=".56" vectorEffect="non-scaling-stroke" />
          <path d="M0 36H384C515 36 526 84 657 84H1440" opacity=".28" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      <div className={`wrap ${styles.stage}`}>
        <ProductFilmReveal className={styles.copy}>
          <div>
            <Kicker>What we make</Kicker>
            <h2 id="product-film-heading">Explore the range.</h2>
          </div>
          <div className={styles.details}>
            <h3>Aluminium at the core.</h3>
            <p>See the layers inside an aluminium cable and explore products for power transmission, distribution, control and earthing.</p>
          </div>
          <div className={styles.catalogue}>
            <Link className="button" href="/products/">View all {productCount} products <Arrow diagonal /></Link>
            <small>Illustrative construction. See the catalogue for individual product specifications.</small>
          </div>
        </ProductFilmReveal>
        <AluminiumCableFeature interactive className={styles.film} />
      </div>
    </section>
  )
}
