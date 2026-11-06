import type { Metadata } from 'next'
import { AnimationPreview } from '@/components/aluminium-cable-preview'

export const metadata: Metadata = {
  title: 'PCI aluminum cable animation preview',
  description: 'Review of the supplied cable video with copper-colored cores changed to silver aluminum.',
  robots: { index: false, follow: false },
}

export default function Page() { return <AnimationPreview/> }
