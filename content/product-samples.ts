/**
 * Real PCI display samples filmed at the works (source clips: htdocs/product_details/, processed by
 * scripts/make-product-clips.mjs). Labels repeat only what is printed on each sample's tag.
 */
export type ProductSample = { video: string; poster: string; label: string }

export const productSamples: Record<string, ProductSample> = {
  'acsr': { video: '/media/samples/acsr.mp4', poster: '/media/samples/acsr.webp', label: 'ACSR Moose display sample' },
  'aac': { video: '/media/samples/aac.mp4', poster: '/media/samples/aac.webp', label: 'AAC Bull display sample' },
  'eco-panther': { video: '/media/samples/eco-panther.mp4', poster: '/media/samples/eco-panther.webp', label: 'ACAR/TW 250 (20/3.99 + 7/2.65 mm), the ECO Panther construction' },
  'gi-earth-wire': { video: '/media/samples/gi-earth-wire.mp4', poster: '/media/samples/gi-earth-wire.webp', label: '19/4.0 mm stay and earth wire' },
  'aerial-bunched-cable': { video: '/media/samples/aerial-bunched-cable.mp4', poster: '/media/samples/aerial-bunched-cable.webp', label: '3C × 95 + 70 + 16 mm² aerial bunched cable' },
  'covered-conductor': { video: '/media/samples/covered-conductor.mp4', poster: '/media/samples/covered-conductor.webp', label: 'Covered conductor display sample' },
  'control-cable': { video: '/media/samples/control-cable.mp4', poster: '/media/samples/control-cable.webp', label: '12C × 2.5 mm² armoured control cable' },
  'lt-xlpe-cable': { video: '/media/samples/lt-xlpe-cable.mp4', poster: '/media/samples/lt-xlpe-cable.webp', label: 'Four-core A2XWY armoured XLPE cable' },
  'pvc-power-cable': { video: '/media/samples/pvc-power-cable.mp4', poster: '/media/samples/pvc-power-cable.webp', label: '2C × 10 mm² AYY PVC cable' },
}
