import Link from 'next/link'
import { Arrow, Picture, TextLink } from '@/components/site'
import { catalogue, families, editedMany, articles } from '@/lib/content'
type Item = typeof catalogue[number]
export function productImage(product: Item) {
  return `/media/products/${product.slug}.webp`
}

export async function ProductGrid({ items, feature = false }: { items: Item[]; feature?: boolean }) {
  const titles = await editedMany(items.map(item => 'product:'+item.slug))
  return <div className={'product-grid '+(feature?'feature-grid':'')}>{items.map(item=><Link className="product-card" key={item.slug} href={'/products/'+item.slug+'/'}>
    <div className="product-image"><Picture src={productImage(item)} alt="" sizes="(max-width: 700px) 50vw, 25vw"/></div>
    <div className="product-label">{feature && <small>{families[item.family]}</small>}<strong>{titles.get('product:'+item.slug)?.title || item.name}</strong><Arrow diagonal/></div>
  </Link>)}</div>
}
export const articleImages: Record<string,string> = { 'pci-have-participated-at-elecrama-2025':'event.webp', 'received-order-from-rvnl':'rail.webp', 'first-order-of-eco-panther-conductor':'eco-news.webp' }
export async function Updates() {
  const titles = await editedMany(articles.map(doc=>doc.slug))
  return <div className="update-grid">{articles.map(doc=><article key={doc.slug}><Link href={'/blog/'+doc.slug+'/'} aria-label={titles.get(doc.slug)?.title || doc.title} className="update-image"><Picture src={'/media/'+articleImages[doc.slug]} alt="" sizes="(max-width: 700px) 100vw, 33vw"/></Link><div>
    <time dateTime={doc.date}>{new Date(doc.date).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</time><h3><Link href={'/blog/'+doc.slug+'/'}>{titles.get(doc.slug)?.title || doc.title}</Link></h3><TextLink href={'/blog/'+doc.slug+'/'}>Read story</TextLink>
  </div></article>)}</div>
}
