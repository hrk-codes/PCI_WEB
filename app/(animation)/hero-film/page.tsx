import type { Metadata } from 'next'
import { HeroFilmStage } from '@/components/hero-film-stage'

export const metadata: Metadata = {
  title: 'PCI hero film stage',
  description: 'Render stage for the homepage hero film.',
  robots: { index: false, follow: false },
}

export default function Page() { return <HeroFilmStage/> }
