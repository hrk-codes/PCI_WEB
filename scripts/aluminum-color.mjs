// Select the warm copper metal independently from red and yellow insulation.
// Copper in this supplied clip occupies 18–40 degrees; yellow bedding is ~49–60.
const ramp = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
export function aluminumColor(data) {
  const pixels = data.length / 3
  const width = 1280
  const candidate = new Uint8Array(pixels)
  const warm = new Uint8Array(pixels)
  const seed = new Uint8Array(pixels)
  const selected = new Uint8Array(pixels)
  const queue = new Int32Array(pixels)
  for (let p = 0; p < pixels; p++) {
    const i = p * 3, r = data[i], g = data[i + 1], b = data[i + 2]
    if (r <= g || g <= b || r < 9) continue
    const hue = 60 * (g - b) / (r - b)
    if (hue < 8 || hue > 68 || (r - b) / r < .12) continue
    candidate[p] = 1
    warm[p] = 1
    if (hue >= 12 && hue < 42) seed[p] = 1
  }
  // Break narrow color reflections linking the yellow bedding to nearby metal.
  for (let p = width + 1; p < pixels - width - 1; p++) {
    if (!candidate[p]) continue
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!warm[p + dy * width + dx]) candidate[p] = 0
    }
  }
  for (let p = 0; p < pixels; p++) {
    if (!candidate[p]) continue
    let head = 0, count = 1, seeds = 0
    queue[0] = p; candidate[p] = 0
    while (head < count) {
      const q = queue[head++]
      seeds += seed[q]
      const x = q % width
      for (const n of [x ? q - 1 : -1, x < width - 1 ? q + 1 : -1, q - width, q + width]) {
        if (n >= 0 && n < pixels && candidate[n]) { candidate[n] = 0; queue[count++] = n }
      }
    }
    if (seeds >= 3 && seeds / count > .35) for (let n = 0; n < count; n++) selected[queue[n]] = 1
  }
  for (let iteration = 0; iteration < 2; iteration++) {
    const previous = selected.slice()
    for (let p = width + 1; p < pixels - width - 1; p++) {
      if (warm[p] && (previous[p - 1] || previous[p + 1] || previous[p - width] || previous[p + width])) selected[p] = 1
    }
  }
  for (let i = 0; i < data.length; i += 3) {
    if (!selected[i / 3]) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (r <= g || g <= b) continue
    const delta = r - b
    if (!delta) continue
    const hue = 60 * (g - b) / delta
    const mask = ramp(.09, .25, delta / Math.max(1, r))
    if (mask < .001) continue
    const silver = 255 * Math.pow(r / 255, .65)
    data[i] = Math.round(r + (silver * .96 - r) * mask)
    data[i + 1] = Math.round(g + (silver * .985 - g) * mask)
    data[i + 2] = Math.round(b + (Math.min(255, silver * 1.015) - b) * mask)
  }
  return data
}
