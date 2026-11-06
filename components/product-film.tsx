import Link from 'next/link'
import { AluminiumCableFeature } from '@/components/aluminium-cable-feature'
import { Arrow, Kicker } from '@/components/site'
import styles from './product-film.module.css'

export function ProductFilm({ productCount }: { productCount: number }) {
  return <section className={`section ${styles.scene}`} aria-labelledby="product-film-heading"><div className="wrap">
    <div className="section-top"><div><Kicker>What we make</Kicker><h2 id="product-film-heading">Explore the range.</h2></div><p>Find products for power transmission, distribution, control and earthing.</p></div>
    <figure className={styles.frame}>
      <AluminiumCableFeature interactive className={styles.film}/>
      <figcaption className={styles.caption}>
        <div><span className={styles.eyebrow}>A closer look</span><h3>Aluminium at the core.</h3><p>Discover the layers within a cable, brought into view through 3D animation.</p><small>Illustrative construction. Explore the catalogue for individual product specifications.</small></div>
        <Link className="button" href="/products/">View all {productCount} products <Arrow diagonal/></Link>
      </figcaption>
    </figure>
  </div></section>
}
