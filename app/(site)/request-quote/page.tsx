import { PublicPage, publicMetadata, type Filters } from '../public-page'

// Reads the address query (a product link pre-selects the product), so it renders per request.
export const dynamic = 'force-dynamic'
type Props = { searchParams: Promise<Filters> }

export const generateMetadata = () => publicMetadata(['request-quote'])
export default async function Page({ searchParams }: Props) {
  return <PublicPage segments={['request-quote']} filters={await searchParams}/>
}
