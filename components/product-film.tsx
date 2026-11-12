import Link from 'next/link'
import { Arrow, Kicker } from '@/components/site'
import { CableBuildFilm } from './cable-build-film'
import { ProductFilmReveal } from './product-film-reveal'
import styles from './product-film.module.css'

export function ProductFilm({ productCount }: { productCount: number }) {
  return <CableBuildFilm copy={
    <ProductFilmReveal className={styles.copy}>
      <div>
        <Kicker>What we make</Kicker>
        <h2 id="product-film-heading">Explore the range.</h2>
      </div>
      <div className={styles.details}>
        <h3>Aluminium at the core.</h3>
        <p>Watch the layers come together inside an armoured aluminium cable, then explore products for power transmission, distribution, control and earthing.</p>
      </div>
      <div className={styles.catalogue}>
        <Link className="button" href="/products/">View all {productCount} products <Arrow diagonal /></Link>
        <small>Illustrative construction. See the catalogue for individual product specifications.</small>
      </div>
    </ProductFilmReveal>
  }/>
}
