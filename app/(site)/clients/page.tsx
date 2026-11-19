import { PublicPage, publicMetadata, type Filters } from '../public-page'

// Reads the address query (the directory filters work without JavaScript), so it renders per request.
export const dynamic = 'force-dynamic'
type Props = { searchParams: Promise<Filters> }

export const generateMetadata = () => publicMetadata(['clients'])
export default async function Page({ searchParams }: Props) {
  return <PublicPage segments={['clients']} filters={await searchParams}/>
}
