import specificationData from './product-specifications.json'

export type SpecificationColumn = { label: string; unit: string }
export type SpecificationTable = {
  id: string
  title: string
  source: string
  page: number
  columns: SpecificationColumn[]
  summaryColumns: number[]
  rows: string[][]
  note?: string
}

export const productSpecifications: Record<string, SpecificationTable[]> = specificationData

type ConstructionLayer = { name: string; detail: string }
type StrandSection = { label: string; total: number; core: number }
type ProductDetail = {
  pages: number[]
  standards: string[]
  layers: ConstructionLayer[]
  application: string
  notes: string[]
  sections?: StrandSection[]
  sizeEnquiry?: string
}

const aluminiumSections = [7, 19, 37, 61, 91].map(total => ({ label: `${total} strands`, total, core: 0 }))
const reinforcedSections = [
  { label: '6 + 1', total: 7, core: 1 },
  { label: '12 + 7', total: 19, core: 7 },
  { label: '30 + 7', total: 37, core: 7 },
  { label: '54 + 7', total: 61, core: 7 },
]
const pvcLayers = [
  { name: 'Conductor', detail: 'Aluminium or copper conductors to IS 8130 Class 2. Solid, stranded, compacted circular or shaped constructions depend on the size and core arrangement.' },
  { name: 'Insulation', detail: 'PVC Type A or heat-resistant PVC Type C to IS 5831. Core colours depend on the core arrangement.' },
  { name: 'Inner sheath', detail: 'Multi-core constructions use PVC Type ST-1, with the listed ST-2, FR, FRLS and LSOH options depending on the construction.' },
  { name: 'Outer sheath', detail: 'PVC Type ST-1 to IS 5831, with options listed in the catalogue. Black or another colour to suit the requirement.' },
]

/** Construction descriptions use the supplied 2026 catalogue. Page numbers are PDF viewer pages. */
export const productDetails: Record<string, ProductDetail> = {
  aac: {
    pages: [5, 8, 9, 13], standards: ['IS 398 Part 1', 'IEC 61089'], sections: aluminiumSections,
    layers: [{ name: 'Aluminium strands', detail: 'All-aluminium wires stranded into a circular conductor. The catalogue illustrates 7, 19, 37, 61 and 91 strand constructions.' }],
    application: 'Bare overhead conductors for transmission and distribution lines. Select the code word, area and wire construction for the specified line design.',
    notes: ['Size tables are grouped by Indian, British, American, German, Canadian and IEC specifications. A code word can have different values under different specifications.'],
  },
  aaac: {
    pages: [5, 12, 14], standards: ['IS 398 Part 4', 'IEC 61089', 'BS EN 50182', 'ASTM B 399'], sections: aluminiumSections,
    layers: [{ name: 'Aluminium alloy strands', detail: 'Aluminium-magnesium-silicon alloy wires stranded into a circular conductor. The illustrated constructions contain 7, 19, 37, 61 or 91 wires.' }],
    application: 'Overhead line projects specifying an aluminium alloy conductor. The directory includes Indian, British/European, American and French specification tables.',
    notes: ['The BS EN 50182 AL3 table lists current capacity at 75°C and 85°C. These temperatures remain attached to their respective values.'],
  },
  acsr: {
    pages: [5, 9, 10, 11, 12], standards: ['IS 398 Part 2', 'IS 398 Part 5', 'IEC 61089'], sections: reinforcedSections,
    layers: [
      { name: 'Aluminium outer wires', detail: 'Circular stranded aluminium forms the conducting layers.' },
      { name: 'Steel reinforcing core', detail: 'A steel core supports the conductor. Aluminium and steel wire counts and diameters are listed separately in the technical data.' },
    ],
    application: 'Overhead transmission and distribution networks specifying steel-reinforced aluminium conductors.',
    notes: ['Choose the applicable standard before comparing code words such as DOG, PANTHER, ZEBRA or MOOSE. The catalogue gives separate tables for national and international specifications.'],
  },
  aacsr: {
    pages: [6, 13], standards: ['IEC 61089'], sections: reinforcedSections,
    layers: [
      { name: 'Aluminium alloy outer wires', detail: 'Aluminium-magnesium-silicon alloy strands form the conducting layers.' },
      { name: 'Steel reinforcing core', detail: 'The steel core is specified separately by wire count, individual diameter and core diameter.' },
    ],
    application: 'Overhead line designs specifying an alloy conductor with steel reinforcement.',
    notes: ['Some code numbers appear more than once with different steel ratios. Expand each entry to compare the steel ratio, areas and wire arrangement.'],
  },
  'al-59': {
    pages: [5, 15], standards: ['IS 398 Part 6', 'IEC 61089', 'SS 424 08 14'], sections: aluminiumSections,
    layers: [{ name: 'AL-59 alloy strands', detail: 'A stranded aluminium-magnesium-silicon alloy conductor. The catalogue describes a minimum conductivity of 59%.' }],
    application: 'Overhead networks specified for AL-59 aluminium alloy conductors.',
    notes: ['The size table includes nominal area, actual sectional area, equivalent copper area, strand count, wire diameter, strength and current capacity at 75°C and 85°C.'],
  },
  acar: {
    pages: [6], standards: [],
    layers: [
      { name: 'Aluminium conducting wires', detail: 'Aluminium wires form the conducting portion of the composite conductor.' },
      { name: 'Aluminium alloy reinforcement', detail: 'Aluminium alloy wires reinforce the conductor. The catalogue illustrates several combinations of aluminium and alloy wires.' },
    ],
    application: 'Overhead line designs where current capacity, strength and conductor weight are considered together.',
    notes: ['The source illustrates constructions including 4 aluminium + 3 alloy, 3 + 4, 15 + 4, 12 + 7, 24 + 13, 18 + 19, 54 + 7, 48 + 13 and 42 + 19 wires.'],
    sizeEnquiry: 'The catalogue describes ACAR construction without a diameter or electrical size table. Send the required aluminium/alloy arrangement, area and applicable standard to PCI for the corresponding dimensions.',
  },
  'eco-panther': {
    pages: [7, 15], standards: ['SS 42408013 / 14', 'IEC 62219', 'IS 398 Part 4'],
    layers: [
      { name: 'Round AL-59 core', detail: 'The illustrated construction has seven round AL-59 wires, arranged as 1 + 6.' },
      { name: 'Trapezoidal AL-59 outer layers', detail: 'Twenty shaped wires in 8 + 12 layers surround the round core. The catalogue describes an alloy containing magnesium, silicon and copper, with up to 96% compactness.' },
    ],
    application: 'Overhead conductor projects specified for the ECO series. The technical directory contains ECO PANTHER sizes of 310 and 353 mm², alongside the related ECO DOG entry.',
    notes: ['Power transfer values are tabulated at 33 kV and 0.95 power factor. Current capacity uses the maximum operating-temperature basis stated in the source.'],
  },
  'gi-earth-wire': {
    pages: [7, 16, 17], standards: ['IS 2141', 'IS 12776', 'ASTM A 363', 'ASTM A 475', 'DIN 48201'],
    layers: [{ name: 'Galvanised steel wires', detail: 'Stranded galvanised high-carbon steel wires. The catalogue describes smooth, uniform strands free from drawing and stranding imperfections.' }],
    application: 'Earth wire, stay wire, guy wire and spacer cable applications as listed in the catalogue. Select the specified grade and construction for the project.',
    notes: ['Rated strengths are separated by steel grade. A dash means that the source does not list a value for that field.'],
  },
  'aerial-bunched-cable': {
    pages: [4, 23], standards: ['IS 14255', 'IS 8130', 'IEC 60502 Part 1'],
    layers: [
      { name: 'Phase conductors', detail: 'Aluminium phase conductors insulated with XLPE or PE.' },
      { name: 'Neutral and street lighting', detail: 'An insulated neutral and street-lighting conductor can be included as required.' },
      { name: 'Messenger conductor', detail: 'Bare or insulated messenger conductor around which the other conductors are assembled. The technical table lists an aluminium alloy messenger.' },
    ],
    application: 'Overhead distribution in rural networks, congested urban lanes and difficult terrain such as hilly, forest and coastal areas, as described in the catalogue.',
    notes: ['The size table separates the phase, street-lighting and messenger conductors. Their cross-sectional areas and resistance values belong to different parts of the assembly.'],
  },
  'lt-xlpe-cable': {
    pages: [4, 24, 25, 26, 27], standards: ['IS 7098 Part 1 · 1988'],
    layers: [
      { name: 'Conductor', detail: 'Aluminium or copper conductors in single-core, two-core, three-core and three-and-a-half-core arrangements.' },
      { name: 'XLPE insulation', detail: 'Cross-linked polyethylene insulation. The catalogue provides insulation thickness for each nominal size.' },
      { name: 'Bedding and armour', detail: 'The illustrated construction has PVC bedding and steel-wire armour. Technical tables distinguish armoured and unarmoured cables.' },
      { name: 'Outer sheath', detail: 'A PVC jacket surrounds the cable. Outer sheath thickness, overall diameter and cable weight are tabulated by construction.' },
    ],
    application: 'Low-voltage power distribution using the specified core arrangement, conductor material and installation method.',
    notes: ['Physical tables distinguish armoured and unarmoured cable diameters and weights. Electrical tables keep aluminium/copper, ground/duct/air ratings and 1-second short-circuit values separate.'],
  },
  'pvc-power-cable': {
    pages: [4, 18, 19, 20, 21, 22], standards: ['IS 1554 Part 1', 'IS 8130', 'IS 5831'], layers: pvcLayers,
    application: '1.1 kV power distribution with AYY aluminium or YY copper unarmoured cables. Select the core arrangement and conductor material in the technical directory.',
    notes: ['Core colours listed in the catalogue include black/red for single core, red/black for two core, and the specified multi-core colour groups. Sheath and insulation options depend on the selected construction.'],
  },
  'control-cable': {
    pages: [4], standards: [],
    layers: [
      { name: 'Multiple conductor cores', detail: 'A multi-conductor construction for control and instrumentation circuits.' },
      { name: 'Insulation and inner sheath', detail: 'Individual cores are insulated and assembled beneath an inner sheath.' },
      { name: 'Armour and outer sheath', detail: 'The catalogue’s illustration shows armour beneath the outer sheath.' },
    ],
    application: 'Automation and instrumentation applications, including measuring and regulating transmissions in automated processes.',
    notes: [],
    sizeEnquiry: 'The catalogue describes the control-cable construction without a control-specific dimension table. Share the core count, conductor size, shielding and installation requirements with PCI for the matching specification.',
  },
  'service-cable': {
    pages: [4], standards: [],
    layers: [
      { name: 'Conductor', detail: 'The conducting core connects the distribution supply to the service point.' },
      { name: 'Insulation', detail: 'Insulation surrounds the conductor.' },
      { name: 'Outer sheath', detail: 'An outer sheath encloses the cable, as shown in the catalogue illustration.' },
    ],
    application: 'The connection from the main distribution supply to the customer’s premises or service point.',
    notes: [],
    sizeEnquiry: 'Service-cable dimensions are not tabulated in this catalogue. Send the conductor material, size, number of cores and installation requirements to PCI for a suitable specification.',
  },
  'covered-conductor': {
    pages: [4], standards: ['EN 50397-1', 'BS EN 50182', 'IEC 61089', 'IS 398 Parts 2 / 4'],
    layers: [
      { name: 'Conductor', detail: 'The dedicated MVCC sheet lists AL-59, AAAC, ACSR and AL-59/ACS conductor options with watertight construction.' },
      { name: 'Conductor screen', detail: 'An extruded semiconductive layer surrounds the conductor.' },
      { name: 'Inner covering', detail: 'XLPE covering without carbon black, as illustrated in the catalogue.' },
      { name: 'Outer covering', detail: 'A UV-resistant, anti-tracking outer layer. The dedicated sheet supplies the 11 kV and 33 kV layer thicknesses.' },
    ],
    application: 'Covered overhead lines above 1 kV and up to 36 kV AC. The directory uses PCI’s dedicated MVCC sheet for 11 kV and 33 kV AAAC and AL-59/ACS dimensions.',
    notes: ['The catalogue describes the covering as protection against accidental contact with other covered conductors and grounded parts. It has reduced insulation properties and can withstand phase-to-earth voltage temporarily. Ask PCI to confirm line-design and clearance requirements.'],
  },
}
