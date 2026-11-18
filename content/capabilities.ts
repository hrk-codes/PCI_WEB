/**
 * Content for the Capabilities pages (testing, certificates, EPC). Test names, licence numbers, IS specifications
 * and certificate details are PCI's own (from the original site and the certificate scans in
 * public/media/capabilities). The one-line explanations describe what each standard test checks.
 */

export type TestFamily = 'conductor' | 'electrical' | 'insulation' | 'fire'

export const testFamilies: Record<TestFamily, { name: string; short: string; text: string }> = {
  conductor: { name: 'Conductor & wire', short: 'Conductor', text: 'Strength, ductility and galvanising of the aluminium and steel wires that carry the load.' },
  electrical: { name: 'Electrical', short: 'Electrical', text: 'Resistance and insulation checks that prove a cable will carry current safely.' },
  insulation: { name: 'Insulation & sheath', short: 'Insulation', text: 'Mechanical, thermal and ageing tests on the PVC and XLPE that protect every core.' },
  fire: { name: 'Fire performance', short: 'Fire', text: 'Flame, smoke, oxygen index and acid gas tests for FR and FRLSH cables.' },
}

/** The 25 in-house tests, numbered as in PCI's published list. */
export const tests: { no: number; name: string; family: TestFamily; proves: string }[] = [
  { no: 1, name: 'Breaking load test of conductor', family: 'conductor', proves: 'Pulls a stranded conductor sample until it parts, to confirm its rated breaking load.' },
  { no: 2, name: 'Elongation test of conductor', family: 'conductor', proves: 'Measures how far the wires stretch before breaking: a check on ductility.' },
  { no: 3, name: 'Conductor resistance test', family: 'electrical', proves: 'Measures DC resistance, corrected to 20 °C, against the standard’s maximum.' },
  { no: 4, name: 'Tensile test for insulation', family: 'insulation', proves: 'Pulls dumb-bell samples of insulation to confirm their tensile strength.' },
  { no: 5, name: 'Elongation test for insulation', family: 'insulation', proves: 'Measures how far insulation and sheath stretch before they break.' },
  { no: 6, name: 'Dip test for steel wires', family: 'conductor', proves: 'Dips galvanised wires in copper sulphate to show the zinc coating is even.' },
  { no: 7, name: 'Ductility test for steel wires', family: 'conductor', proves: 'Wraps and twists steel wire to confirm it bends without cracking.' },
  { no: 8, name: 'Insulation resistance test', family: 'electrical', proves: 'Applies a test voltage across the insulation to confirm it holds back leakage.' },
  { no: 9, name: 'Conditioning chamber test', family: 'insulation', proves: 'Holds samples at controlled temperature before testing, so results compare fairly.' },
  { no: 10, name: 'Hot set test for XLPE cables', family: 'insulation', proves: 'Loads XLPE in a hot oven to confirm the insulation is fully cross-linked.' },
  { no: 11, name: 'Hot air oven test for XLPE cables', family: 'insulation', proves: 'Ages insulation in circulating hot air, then retests it to show it lasts.' },
  { no: 12, name: 'Water absorption test', family: 'insulation', proves: 'Immerses insulation in hot water to check how little moisture it takes up.' },
  { no: 13, name: 'Loss of mass test for cables', family: 'insulation', proves: 'Weighs PVC before and after heating to check it keeps its plasticiser.' },
  { no: 14, name: 'Thermal stability test of cables', family: 'insulation', proves: 'Heats PVC to find how long it resists breaking down.' },
  { no: 15, name: 'Mass of zinc coating test', family: 'conductor', proves: 'Strips and weighs the zinc layer to confirm the galvanising thickness.' },
  { no: 16, name: 'Resistance test for cable', family: 'electrical', proves: 'Checks the conductor resistance of every finished core.' },
  { no: 17, name: 'Smoke density test for FRLSH / FR cable', family: 'fire', proves: 'Burns samples in a closed chamber and measures how much light the smoke blocks.' },
  { no: 18, name: 'Oxygen index for FRLSH / FR cable', family: 'fire', proves: 'Finds the lowest oxygen concentration in which the compound keeps burning.' },
  { no: 19, name: 'Halogen acid gas test for FRLSH cable', family: 'fire', proves: 'Measures the acid gas the compound releases when it burns.' },
  { no: 20, name: 'Shrinkage test for cables', family: 'insulation', proves: 'Heats insulation to check it does not shrink back along the conductor.' },
  { no: 21, name: 'Flame retardant test for FR / FRLSH cable', family: 'fire', proves: 'Applies a flame and checks the burn stops within the permitted length.' },
  { no: 22, name: 'Flammability test for cables', family: 'fire', proves: 'Checks that a burning cable sample puts itself out once the flame is removed.' },
  { no: 23, name: 'Carbon content test for XLPE', family: 'insulation', proves: 'Confirms the carbon black that shields outdoor XLPE from sunlight.' },
  { no: 24, name: 'Cold bend test for cables', family: 'insulation', proves: 'Bends cable in the cold to check the insulation does not crack.' },
  { no: 25, name: 'Colour fastness test for cables', family: 'insulation', proves: 'Checks core colours stay clear and identifiable throughout service.' },
]

export const isoCertificates = [
  { code: 'ISO 9001:2015', system: 'Quality management', number: 'KDACQ202405105', issued: '28 May 2024', validUntil: '27 May 2027', image: '/media/capabilities/iso-9001.webp' },
  { code: 'ISO 14001:2015', system: 'Environmental management', number: 'KDACE202508003', issued: '4 August 2025', validUntil: '3 August 2028', image: '/media/capabilities/iso-14001.webp' },
  { code: 'ISO 45001:2018', system: 'Occupational health and safety', number: 'KDACO202508003', issued: '4 August 2025', validUntil: '3 August 2028', image: '/media/capabilities/iso-45001.webp' },
]
export const certificationBody = 'KVQA Certification Services Pvt. Ltd.'
export const certifiedScope = 'Manufacturer of cables and conductors, galvanised steel strand (stay and earth), turnkey and EPC projects on electrical transmission, distribution and generation systems.'

/** BIS product certification licences. `product` links the licence to its product page where it is a direct match. */
export const bisLicences = [
  { licence: 'CM/L-5100025265', standard: 'IS 14255 : 1995', name: 'Aerial bunched cables for working voltages up to and including 1100 V', product: 'aerial-bunched-cable' },
  { licence: 'CM/L-5100042871', standard: 'IS 1554 (Part 1) : 1988', name: 'PVC insulated (heavy duty) electric cables for working voltages up to and including 1100 V', product: 'pvc-power-cable' },
  { licence: 'CM/L-5100025164', standard: 'IS 7098 (Part 1) : 1988', name: 'Cross-linked polyethylene insulated PVC sheathed cables for working voltages up to and including 1100 V', product: 'lt-xlpe-cable' },
  { licence: 'CM/L-5500129006', standard: 'IS 398 (Part 1) : 1996', name: 'Aluminium stranded conductors for overhead transmission', product: 'aac' },
  { licence: 'CM/L-5100163681', standard: 'IS 398 (Part 2) : 1996', name: 'Aluminium conductors, galvanised steel reinforced, for overhead transmission', product: 'acsr' },
  { licence: 'CM/L-5500129208', standard: 'IS 398 (Part 4) : 1994', name: 'Aluminium alloy stranded conductors (aluminium magnesium silicon type)', product: 'aaac' },
  { licence: 'CM/L-5100057985', standard: 'IS 694 : 2010', name: 'PVC insulated unsheathed and sheathed cables and cords with rigid and flexible conductors, up to and including 1100 V', product: undefined },
  { licence: 'CM/L-5500138512', standard: 'IS 2141 : 2000', name: 'Hot-dip galvanised stay strand', product: 'gi-earth-wire' },
]
