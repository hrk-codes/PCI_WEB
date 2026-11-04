import Link from 'next/link'
export default function NotFound() {
  return <div className="wrap section"><p>404 · Page not found</p><h1>We couldn’t find that page.</h1><p>Explore our products or go back to the homepage.</p><Link className="button" href="/products/">Explore products</Link> <Link className="text-link" href="/">Go home ↗</Link></div>
}
