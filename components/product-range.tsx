import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { catalogue, editedMany, families as familyNames } from '@/lib/content'
import { productHighlights, productStructure, type ProductFamily, type ProductGroup, type ProductSet } from '@/content/product-structure'
import { Arrow } from './site'
import styles from './product-range.module.css'

/**
 * The product range as PCI organises it (content/product-structure.ts), on one dark stage: a sticky navigator, then a
 * band per family. Inside each band a six-column grid carries everything inline: a label tile introduces each set
 * (Conventional, High ampacity, HTLS…) and is followed by its products, so rows stay full and nothing floats in empty
 * space. Every product stands on its own lit stage (transparent model renders from public/media/product-cutouts).
 * Used by /products/ (all families) and the family pages (/conductors/, /cables/, /earth-wire/).
 */
const bySlug = Object.fromEntries(catalogue.map(product => [product.slug, product]))
const countOf = (family: ProductFamily) => family.groups.reduce((sum, group) => sum + group.sets.reduce((n, set) => n + set.items.length, 0), 0)
const plural = (n: number) => `${n} ${n === 1 ? 'product' : 'products'}`
const span = (n: number) => ({ '--span': n } as CSSProperties)
const COLUMNS = 6

type Tile =
  | { kind: 'label'; group: ProductGroup; set: ProductSet; span: number }
  | { kind: 'product'; slug: string; caption?: string; htls: boolean }
  | { kind: 'enquiry'; family: ProductFamily; span: number }
/** A set and its products, kept together on one row; `width` is its number of grid columns. */
type Block = { id: string; tiles: Tile[]; width: number; htls: boolean }

const widthOf = (tiles: Tile[]) => tiles.reduce((n, tile) => n + (tile.kind === 'product' ? 1 : tile.span), 0)

/**
 * Lays a family out as blocks: a set's label tile with its products (when the family has sets), or one block of
 * captioned products. Blocks are then packed so every row of six is full (a later block moves up to fill a row
 * rather than leave a gap), and a short final row is completed with an enquiry tile.
 */
function blocksOf(family: ProductFamily): Block[] {
  const blocks: Block[] = []
  const labelled = family.groups.some(group => group.sets.length > 1)
  for (const group of family.groups) for (const set of group.sets) {
    const htls = set.id === 'htls'
    const tiles: Tile[] = labelled ? [{ kind: 'label', group, set, span: set.items.length === 1 ? 2 : 1 }] : []
    for (const slug of set.items) {
      const short = bySlug[slug].short.toLowerCase(), title = group.title.toLowerCase()
      tiles.push({ kind: 'product', slug, caption: !labelled && !short.includes(title) && !title.includes(short) ? group.title : undefined, htls })
    }
    const last = blocks[blocks.length - 1]
    if (!labelled && last) { last.tiles.push(...tiles); last.width = widthOf(last.tiles) }
    else blocks.push({ id: set.id, tiles, width: widthOf(tiles), htls })
  }
  const packed: Block[] = []
  let free = COLUMNS
  while (blocks.length) {
    let next = blocks.findIndex(block => block.width <= free)
    if (next < 0) { free = COLUMNS; next = 0 }
    const [block] = blocks.splice(next, 1)
    packed.push(block)
    free -= Math.min(block.width, COLUMNS)
    if (free <= 0) free = COLUMNS
  }
  if (free < COLUMNS) packed.push({ id: 'enquiry', tiles: [{ kind: 'enquiry', family, span: free }], width: free, htls: false })
  return packed
}

function Navigator({ current }: { current?: string }) {
  return <nav className={styles.navigator} aria-label="Product range">
    <div className={styles.navFamilies}>
      <Link href="/products/" aria-current={!current ? 'page' : undefined}>All<span>{catalogue.length}</span></Link>
      {productStructure.map(family => <Link key={family.id} href={current ? `/${family.id}/` : `#${family.id}`} aria-current={current === family.id ? 'page' : undefined}>
        {familyNames[family.id]}<span>{countOf(family)}</span>
      </Link>)}
      <a className={styles.navPdf} href="/media/catalogue.pdf">Catalogue PDF <Arrow diagonal/></a>
    </div>
  </nav>
}

function ProductTile({ tile, title, first }: { tile: Extract<Tile, { kind: 'product' }>; title: string; first: boolean }) {
  const product = bySlug[tile.slug]
  return <div className={styles.cell}>
    <Link className={styles.card} href={`/products/${tile.slug}/`} data-htls={tile.htls || undefined}>
      <span className={styles.stage}>
        {tile.caption && <span className={styles.caption}>{tile.caption}</span>}
        <Image src={`/media/product-cutouts/${tile.slug}.webp`} alt="" width={1100} height={760} sizes="(max-width: 640px) 46vw, (max-width: 1100px) 24vw, 15vw" preload={first} className={styles.model}/>
        <span className={styles.floor} aria-hidden="true"/>
      </span>
      <span className={styles.body}>
        <b className={styles.code}>{product.short}</b>
        <span className={styles.name}>{title}</span>
        <span className={styles.highlight}>{productHighlights[tile.slug]}</span>
      </span>
      <span className={styles.go} aria-hidden="true"><Arrow diagonal/></span>
    </Link>
  </div>
}

export async function ProductRange({ current }: { current?: string }) {
  const shown = productStructure.filter(family => !current || family.id === current)
  const titles = await editedMany(catalogue.map(product => 'product:' + product.slug))
  let first = true
  return <div className={styles.range}>
    <Navigator current={current}/>
    {shown.map(family => <section key={family.id} id={family.id} className={styles.family} aria-labelledby={`${family.id}-title`}>
      <header className={styles.head}>
        <span className={styles.number} aria-hidden="true">0{productStructure.indexOf(family) + 1}</span>
        <h2 id={`${family.id}-title`}>{family.title}</h2>
        <p>{family.text}</p>
        <span className={styles.count}>{plural(countOf(family))}</span>
      </header>
      <div className={styles.grid}>
        {blocksOf(family).map(block => <div key={block.id} className={styles.block} style={span(block.width)} data-htls={block.htls || undefined}>
          {block.tiles.map(tile => {
            if (tile.kind === 'label') {
              const { group, set } = tile
              const own = group.sets.length > 1
              return <div key={`label-${set.id}`} id={own ? set.id : group.id} className={styles.label} style={span(tile.span)} data-htls={set.id === 'htls' || undefined}>
                {own && <small>{group.title}</small>}
                <h3>{own ? set.title : group.title}</h3>
                {set.badge && <span className={styles.badge}>{set.badge}</span>}
                <p>{set.text ?? group.text}</p>
                <span className={styles.labelCount}>{plural(set.items.length)} <i aria-hidden="true">→</i></span>
              </div>
            }
            if (tile.kind === 'enquiry') return <div key="enquiry" className={styles.enquiry} style={span(tile.span)}>
              <small>Specify it with PCI</small>
              <h3>Need {/^[aeiou]/i.test(tile.family.title) ? 'an' : 'a'} {tile.family.title.toLowerCase()} construction for your project?</h3>
              <p>Share the size, standard and application. PCI’s team in Dankuni confirms the construction and data.</p>
              <Link className="button" href="/request-quote/">Request a quote <Arrow diagonal/></Link>
            </div>
            const card = <ProductTile key={tile.slug} tile={tile} title={titles.get('product:' + tile.slug)?.title || bySlug[tile.slug].name} first={first}/>
            first = false
            return card
          })}
        </div>)}
      </div>
    </section>)}
  </div>
}
