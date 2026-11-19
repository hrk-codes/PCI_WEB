import { PublicPage, publicMetadata, publicPaths } from '../public-page'

// Prerendered at build and served ready-made. CMS edits refresh it at once (the site-content hook in
// payload.config.ts); the hourly revalidate is a safety net.
export const revalidate = 3600
type Props = { params: Promise<{ segments: string[] }> }

export const generateStaticParams = () => publicPaths().map(segments => ({ segments }))
export const generateMetadata = async ({ params }: Props) => publicMetadata((await params).segments)
export default async function Page({ params }: Props) {
  return <PublicPage segments={(await params).segments}/>
}
