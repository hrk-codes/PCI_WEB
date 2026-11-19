/**
 * Stills from PCI display samples filmed at the works. Labels repeat the sample tags.
 */
type ProductSample = { image: string; label: string }

export const productSamples: Record<string, ProductSample> = {
  'acsr': { image: '/media/samples/acsr.webp', label: 'ACSR Moose display sample' },
  'aac': { image: '/media/samples/aac.webp', label: 'AAC Bull display sample' },
  'eco-panther': { image: '/media/samples/eco-panther.webp', label: 'ACAR/TW 250 (20/3.99 + 7/2.65 mm), the ECO Panther construction' },
  'gi-earth-wire': { image: '/media/samples/gi-earth-wire.webp', label: '19/4.0 mm stay and earth wire' },
  'aerial-bunched-cable': { image: '/media/samples/aerial-bunched-cable.webp', label: '3C × 95 + 70 + 16 mm² aerial bunched cable' },
  'covered-conductor': { image: '/media/samples/covered-conductor.webp', label: 'Covered conductor display sample' },
  'control-cable': { image: '/media/samples/control-cable-copper.webp', label: 'Four-core copper control cable display sample' },
  'lt-xlpe-cable': { image: '/media/samples/lt-xlpe-cable.webp', label: 'Four-core A2XWY armoured XLPE cable' },
  'pvc-power-cable': { image: '/media/samples/pvc-power-cable.webp', label: '2C × 10 mm² AYY PVC cable' },
}
