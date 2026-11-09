type Milestone = {
  date: string
  dateLabel: string
  title: string
  description: string
  link?: { label: string; href: string }
}

export type MilestoneImage = {
  file: string
  alt: string
  caption: string
  fit: 'photo' | 'product'
}

type Chapter = {
  id: string
  years: string
  title: string
  intro: string
  events: Milestone[]
  images?: MilestoneImage[]
}

export const milestoneChapters: Chapter[] = [
  // Published chronology: https://pcicablesindustries.com/achievements/
  {
    id: 'foundations',
    years: '2013–2019',
    title: 'From cables to conductors',
    intro: 'PCI started with cable manufacturing and added conductors as its range grew.',
    events: [
      { date: '2013-09-06', dateLabel: '6 September 2013', title: 'The journey begins', description: 'PCI Cables begins its journey in West Bengal.' },
      { date: '2014', dateLabel: '2014', title: 'Cable manufacturing begins', description: 'PCI starts manufacturing and supplying cables.' },
      { date: '2019', dateLabel: '2019', title: 'The range expands to conductors', description: 'PCI starts manufacturing and supplying conductors.' },
    ],
    images: [{
      file: 'factory.webp',
      alt: 'Cable drums and production equipment inside the PCI works',
      caption: 'Inside PCI’s manufacturing works in Dankuni',
      fit: 'photo',
    }],
  },
  {
    id: 'first-exports',
    years: '2022',
    title: 'First exports',
    intro: 'In 2022, PCI recorded a conductor manufacturing milestone and made its first exports of conductors and cables.',
    events: [
      { date: '2022', dateLabel: '2022', title: 'First 61-strand conductor order', description: 'PCI completes its first order for a 61-strand conductor.' },
      { date: '2022-06', dateLabel: 'June 2022', title: 'Conductors to Uganda', description: 'Uganda is the destination for PCI’s first conductor export.' },
      { date: '2022-10', dateLabel: 'October 2022', title: 'Cables to Nepal', description: 'PCI makes its first cable export to Nepal.' },
    ],
  },
  {
    id: 'conductor-orders',
    years: '2023–2024',
    title: 'New conductor orders',
    intro: 'The first AL-59 and ECO Panther orders marked the next steps in PCI’s conductor range.',
    events: [
      { date: '2023-07', dateLabel: 'July 2023', title: 'First AL-59 order completed', description: 'PCI completes its first order for AL-59 aluminium alloy conductor.' },
      // March receipt: https://pcicablesindustries.com/2024/03/16/first-order-of-eco-panther-conductor/
      { date: '2024-03', dateLabel: 'March 2024', title: 'ECO Panther order received', description: 'PCI receives its first ECO Panther conductor order for a renewable energy project in Madhya Pradesh.', link: { label: 'Read the order announcement', href: '/blog/first-order-of-eco-panther-conductor/' } },
      { date: '2024-06', dateLabel: 'June 2024', title: 'ECO Panther order completed', description: 'PCI completes its first ECO Panther conductor order.' },
    ],
    images: [
      { file: 'al-59.webp', alt: 'AL-59 cross section showing the conductor strands', caption: 'AL-59 · Conductor cross section', fit: 'product' },
      { file: 'eco-panther.webp', alt: 'ECO Panther conductor with shaped outer strands', caption: 'ECO Panther · Product detail', fit: 'product' },
    ],
  },
  // Exhibition and first covered-conductor order: https://pcicablesindustries.com/news/
  {
    id: 'exhibition-and-orders',
    years: '2025',
    title: 'Exhibition and covered conductor',
    intro: 'PCI took its range to ELECRAMA and later recorded a first order for a 33 kV covered conductor.',
    events: [
      { date: '2025-02', dateLabel: 'February 2025', title: 'PCI at ELECRAMA', description: 'PCI showcases cables, conductors and earth wire at India Expo Mart in Greater Noida.', link: { label: 'Read the ELECRAMA story', href: '/blog/pci-have-participated-at-elecrama-2025/' } },
      { date: '2025-09', dateLabel: 'September 2025', title: 'First 33 kV covered conductor order', description: 'PCI completes its first order for a 33 kV, 353 mm² covered conductor.' },
    ],
    images: [
      { file: '2025-11-elecrama-2.webp', alt: 'Visitors at the PCI Cables booth at ELECRAMA 2025', caption: 'PCI Cables booth · ELECRAMA 2025', fit: 'photo' },
      { file: 'covered-conductor.webp', alt: 'Cross section of a covered conductor', caption: 'Covered conductor · Product illustration', fit: 'product' },
    ],
  },
]
