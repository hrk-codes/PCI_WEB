/**
 * How PCI's range is organised: family → group → set → products (slugs from content/catalogue.json).
 * The Products page, the family pages, product breadcrumbs and the menu all read this one structure.
 *
 * Highlights are one-line facts: from PCI's catalogue, or the defining trait of the construction type.
 */
export type ProductSet = { id: string; title: string; text?: string; badge?: string; items: string[] }
export type ProductGroup = { id: string; title: string; text: string; sets: ProductSet[] }
export type ProductFamily = { id: 'conductors' | 'cables' | 'earth-wire'; title: string; text: string; groups: ProductGroup[] }

export const productStructure: ProductFamily[] = [
  {
    id: 'conductors', title: 'Conductors',
    text: 'Bare overhead conductors for transmission and distribution lines up to 800 kV, in aluminium, aluminium alloy and copper.',
    groups: [
      {
        id: 'aluminium-conductors', title: 'Aluminium conductors',
        text: 'From proven conventional constructions to high-ampacity alloys and high-temperature, low-sag (HTLS) designs that raise a line’s capacity on its existing towers.',
        sets: [
          { id: 'conventional', title: 'Conventional conductors', text: 'All-aluminium, alloy and steel-reinforced constructions for everyday overhead lines.', items: ['aac', 'aaac', 'acsr', 'aacsr', 'acar'] },
          { id: 'high-ampacity', title: 'High ampacity conductors', text: 'Higher-conductivity alloys and compact trapezoidal strands carry more current in the same size.', items: ['al-59', 'eco-panther'] },
          { id: 'htls', title: 'HTLS conductors', badge: 'High temperature · low sag', text: 'Run hotter without sagging further, so an existing line can carry substantially more current: the route to re-conductoring without new towers.', items: ['acss', 'carbon-core', 'invar', 'gap', 'tacsr'] },
        ],
      },
      {
        id: 'copper-conductors', title: 'Copper conductor',
        text: 'Stranded copper where its conductivity is specified, for lines, substations and earthing.',
        sets: [{ id: 'copper', title: 'Copper conductor', items: ['copper-conductor'] }],
      },
    ],
  },
  {
    id: 'cables', title: 'Cables',
    text: 'Insulated cables for overhead distribution, power, control and service connections, and covered conductors up to 36 kV.',
    groups: [
      { id: 'aerial-bunched', title: 'Aerial bunched cable', text: 'Insulated cores twisted around a messenger, for safer overhead distribution.', sets: [{ id: 'abc', title: 'Aerial bunched cable', items: ['aerial-bunched-cable'] }] },
      { id: 'power', title: 'Power cable', text: 'XLPE and PVC insulated power cables for low-voltage distribution and industry.', sets: [{ id: 'power-cable', title: 'Power cable', items: ['lt-xlpe-cable', 'pvc-power-cable'] }] },
      { id: 'control', title: 'Control cable', text: 'Multi-core cables for control circuits, instrumentation and automation.', sets: [{ id: 'control-cable', title: 'Control cable', items: ['control-cable'] }] },
      { id: 'service', title: 'Service cable', text: 'The connection from the distribution supply to the customer’s service point.', sets: [{ id: 'service-cable', title: 'Service cable', items: ['service-cable'] }] },
      { id: 'mvcc', title: 'MVCC', text: 'Medium voltage covered conductor for overhead lines above 1 kV and up to 36 kV.', sets: [{ id: 'covered', title: 'Medium voltage covered conductor', items: ['covered-conductor'] }] },
    ],
  },
  {
    id: 'earth-wire', title: 'Earth Wire',
    text: 'Galvanised steel conductors that shield overhead lines and bond structures to earth.',
    groups: [
      { id: 'bec', title: 'BEC', text: 'Buried earth conductor, laid underground along the route.', sets: [{ id: 'buried', title: 'Buried earth conductor', items: ['bec'] }] },
      { id: 'earth-wires', title: 'Earth wire', text: 'Overhead earth, stay and guy wire in 3 to 19 strands.', sets: [{ id: 'gi', title: 'Earth wire', items: ['gi-earth-wire'] }] },
    ],
  },
]

/** A product's one-line highlight on its card. */
export const productHighlights: Record<string, string> = {
  aac: 'All aluminium',
  aaac: 'Al-Mg-Si alloy',
  acsr: 'Steel reinforced',
  aacsr: 'Alloy, steel reinforced',
  acar: 'Alloy reinforced',
  'al-59': 'Min. 59% conductivity',
  'eco-panther': 'Trapezoidal AL-59, up to 96% compact',
  acss: 'Annealed aluminium, up to 250°C',
  'carbon-core': 'Composite core, trapezoidal strands',
  invar: 'Invar core, up to 210°C',
  gap: 'Grease-filled gap, steel-core tension',
  tacsr: 'Thermal-resistant alloy, up to 150°C',
  'copper-conductor': 'Stranded copper',
  'aerial-bunched-cable': 'Messenger supported, up to 1.1 kV',
  'lt-xlpe-cable': 'XLPE insulated, IS 7098',
  'pvc-power-cable': 'PVC insulated, IS 1554',
  'control-cable': 'Multi-core control',
  'service-cable': 'Two-core flat, solid aluminium',
  'covered-conductor': 'Covered, up to 36 kV',
  bec: 'Galvanised steel, up to 19 strands',
  'gi-earth-wire': 'Galvanised steel, 3 to 19 strands',
}

/** Where a product sits in the structure (for breadcrumbs, kickers and related products). */
export function placeOf(slug: string) {
  for (const family of productStructure) for (const group of family.groups) for (const set of group.sets) {
    if (set.items.includes(slug)) return { family, group, set }
  }
  return undefined
}
