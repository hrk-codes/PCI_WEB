import type { Metadata } from 'next'
import { ConductorRenderStage } from '@/components/conductor-render-stage'

export const metadata: Metadata = {
  title: 'PCI conductor render stage',
  description: 'Studio stage for rendering the overhead conductor product images.',
  robots: { index: false, follow: false },
}

export default function Page() { return <ConductorRenderStage/> }
