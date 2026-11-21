/**
 * News in brief, shown on the Blog: PCI's published news list (formerly pcicablesindustries.com/news/), newest first.
 * `story` links an item to its full blog post.
 */
export type BriefKind = 'Order' | 'Delivered' | 'Export' | 'Event'

export type BriefItem = { month: string; kind: BriefKind; title: string; detail: string; story?: string }

export const newsBrief: { year: string; items: BriefItem[] }[] = [
  { year: '2025', items: [
    { month: 'Sep', kind: 'Delivered', title: 'First 33 kV covered conductor', detail: '33 kV, 353 sq mm covered conductor executed for the first time.' },
    { month: 'Feb', kind: 'Event', title: 'PCI at ELECRAMA 2025', detail: 'At the largest standalone show in the electrical industry, organised by IEEMA.', story: 'pci-have-participated-at-elecrama-2025' },
  ] },
  { year: '2024', items: [
    { month: 'Dec', kind: 'Delivered', title: 'First MVCC order executed', detail: 'Medium voltage covered conductor, ACS Rabbit (52.8 sq mm).' },
    { month: 'Aug', kind: 'Order', title: '₹437.5 million from RVNL', detail: 'Conductors and earth wire for Rail Vikas Nigam Ltd.' },
    { month: 'Mar', kind: 'Order', title: 'First ECO Panther order', detail: 'ECO Panther conductor (353 sq mm) for a wind power project.', story: 'first-order-of-eco-panther-conductor' },
    { month: 'Feb', kind: 'Order', title: 'RVNL order for the Mumbai Metro', detail: 'ACSR (OPC/BEC) 93.3 sq mm conductor.', story: 'received-order-from-rvnl' },
    { month: 'Feb', kind: 'Order', title: 'First ACSR Moose order', detail: 'From Jharkhand Urja Sancharan Nigam Ltd.' },
    { month: 'Jan', kind: 'Export', title: 'First GSW wire order', detail: 'Galvanised steel wire for a transmission project in Nigeria.' },
  ] },
  { year: '2023', items: [
    { month: 'Dec', kind: 'Export', title: 'First 91-strand conductor', detail: '800 sq mm AAAC for the Transmission Company of Nigeria.' },
    { month: 'Oct', kind: 'Delivered', title: 'Conductor for the Rapid Metro', detail: 'First consignment for the Delhi–Ghaziabad–Meerut RRTS.' },
    { month: 'Sep', kind: 'Order', title: 'First order from IRCON', detail: '₹31 million of AAC and ACSR conductor for the Rapid Metro.' },
    { month: 'Jul', kind: 'Delivered', title: 'First AL-59 conductor', detail: 'The first AL-59 aluminium alloy conductor order executed.' },
  ] },
  { year: '2022', items: [
    { month: 'Oct', kind: 'Export', title: 'First cable export', detail: 'Cable for the Nepal Electricity Authority.' },
    { month: 'Jun', kind: 'Export', title: 'First conductor export', detail: 'Conductor for UETCL, Uganda.' },
    { month: '', kind: 'Delivered', title: 'First 61-strand conductor', detail: 'The first 61-strand conductor order executed.' },
  ] },
]
