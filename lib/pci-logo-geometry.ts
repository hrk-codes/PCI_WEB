/**
 * The PCI Cables mark as stroke centrelines, in the 165 × 107 units of public/media/brand/pci-logo.svg (the SVG's
 * translate(.8 1) already applied). Every stroke in the logo has round ends, so each one is a tube of the stroke's
 * radius: seen straight on, the 3D logo (lib/pci-logo-scene.ts) lines up with the flat SVG exactly.
 */
export type Point = [number, number]
export const LOGO_WIDTH = 165
export const LOGO_HEIGHT = 107
/** Vertical extent of the mark itself (P, C, I and CABLES), without the "Industries Pvt. Ltd." line. */
export const MARK_TOP = .8
export const MARK_HEIGHT = 99.4 - .8
export const logoColours = { orange: '#fd8b01', blue: '#2196f3', grey: '#525152', navy: '#062355' }

const STEP = .45
const deg = (d: number) => d * Math.PI / 180
function line(a: Point, b: Point): Point[] {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP))
  return Array.from({length:n + 1}, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n] as Point)
}
/** Circular arc; angles in degrees, measured in SVG space (y down), from a0 to a1 in either direction. */
function arc(c: Point, r: number, a0: number, a1: number): Point[] {
  const n = Math.max(2, Math.ceil(Math.abs(deg(a1 - a0)) * r / STEP))
  return Array.from({length:n + 1}, (_, i) => { const a = deg(a0 + (a1 - a0) * i / n); return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)] as Point })
}
function quad(a: Point, q: Point, b: Point): Point[] {
  const n = 14
  return Array.from({length:n + 1}, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * q[0] + t * t * b[0], u * u * a[1] + 2 * u * t * q[1] + t * t * b[1]] as Point })
}
function cubic(a: Point, p: Point, q: Point, b: Point): Point[] {
  const n = 18
  return Array.from({length:n + 1}, (_, i) => {
    const t = i / n, u = 1 - t
    return [u * u * u * a[0] + 3 * u * u * t * p[0] + 3 * u * t * t * q[0] + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * p[1] + 3 * u * t * t * q[1] + t * t * t * b[1]] as Point
  })
}
/** Joins pieces into one polyline, dropping the repeated joint points. */
function chain(...pieces: Point[][]): Point[] { return pieces.flatMap((piece, i) => i ? piece.slice(1) : piece) }

/** P: the stem rises from its rounded foot, then the bowl loops clockwise and ends just inside itself. */
export const pStroke = { radius:6, points:chain(line([9.55, 92.4], [9.55, 35]), arc([36.55, 35], 27, 180, 447)) }
/** The cut cable end branching off the stem at 45°: sheath, a short insulation stub, then the bare strands. */
export const cableEnd = { from:[9.55, 63.25] as Point, cut:[34.3, 38.5] as Point, sheathRadius:4.95, insulationRadius:3.55, insulationLength:1.9, strandRadius:.6, strandLength:9 }
export const cStroke = { radius:6.7, points:arc([110.3, 35.5], 26, -35.2, -324.8) }
/** I rises from the bottom. */
export const iStroke = { radius:6.8, points:line([156.4, 62], [156.4, 10.2]) }

const o = (x: number, y: number): Point => [x + .8, y + 1]
export const lettersRadius = 1.3
/** CABLES, letter by letter; each letter is one or more strokes. */
export const letters: Point[][][] = [
  [arc(o(29.5, 82.3), 10, -40, -320)],
  [chain(line(o(45.8, 92.6), o(56, 72.3)), line(o(56, 72.3), o(66.2, 92.6))), line(o(49, 87.3), o(63, 87.3))],
  [
    chain(line(o(72.3, 92.3), o(72.3, 72.3)), line(o(72.3, 72.3), o(84.2, 72.3)), quad(o(84.2, 72.3), o(89.3, 72.3), o(89.3, 77.2)), quad(o(89.3, 77.2), o(89.3, 82.1), o(84.2, 82.1)), line(o(84.2, 82.1), o(72.3, 82.1))),
    chain(quad(o(84.2, 82.1), o(90.4, 82.1), o(90.4, 87.2)), quad(o(90.4, 87.2), o(90.4, 92.3), o(84.6, 92.3)), line(o(84.6, 92.3), o(72.3, 92.3))),
  ],
  [chain(line(o(97.9, 72.2), o(97.9, 92.3)), line(o(97.9, 92.3), o(114.8, 92.3)))],
  [chain(line(o(137.3, 72.3), o(120.4, 72.3)), line(o(120.4, 72.3), o(120.4, 92.3)), line(o(120.4, 92.3), o(137.3, 92.3))), line(o(120.4, 82.1), o(132.4, 82.1))],
  [chain(
    cubic(o(160.6, 75.4), o(158.8, 73.2), o(155.8, 72.3), o(152.3, 72.3)),
    cubic(o(152.3, 72.3), o(147, 72.3), o(143.4, 74.2), o(143.4, 77.3)),
    cubic(o(143.4, 77.3), o(143.4, 80.8), o(147, 81.8), o(152, 82.4)),
    cubic(o(152, 82.4), o(158, 83.1), o(161.8, 84.4), o(161.8, 87.6)),
    cubic(o(161.8, 87.6), o(161.8, 90.8), o(157.8, 92.3), o(152.3, 92.3)),
    cubic(o(152.3, 92.3), o(148, 92.3), o(144.3, 91.2), o(142.4, 88.6)),
  )],
]
