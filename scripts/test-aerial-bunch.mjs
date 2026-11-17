// Run against the local preview. Checks actual solids as well as the manual viewer.
import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import * as T from 'three'
import ts from 'typescript'
import { chromium } from 'playwright-core'

const require = createRequire(import.meta.url)
const source = (await readFile(new URL('../lib/aerial-bunched-model.ts', import.meta.url), 'utf8')).replace("from 'three'", `from '${import.meta.resolve('three')}'`)
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
const { buildAerialBunch } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const model = buildAerialBunch()
assert.equal(model.group.children.length, 5)
const members = model.group.children
const meshes = []
model.group.traverse(object => { if (object.isMesh) meshes.push(object) })
const original = meshes.map(mesh => mesh.geometry.attributes.position.array.slice())
assert.equal(meshes.reduce((sum, mesh) => sum + (mesh.userData.strandCount || 0), 0), 83)
assert.ok(members[4].children.every(mesh => !Array.isArray(mesh.material) && mesh.material.name === 'Stranded aluminium'), 'The thin member has metal only, without an insulating shell')

// All four large members must be identical rotations, not four mismatched core sizes.
for (let member = 1; member < 4; member++) members[member].children.forEach((mesh, part) => {
  const reference = members[0].children[part].geometry.attributes.position
  const points = mesh.geometry.attributes.position
  for (let index = 0; index < points.count; index += 31) {
    const point = new T.Vector3().fromBufferAttribute(points, index).applyAxisAngle(new T.Vector3(0, 1, 0), member * Math.PI / 2)
    assert.ok(point.distanceTo(new T.Vector3().fromBufferAttribute(reference, index)) < .000002, 'Equal insulated members retain their exact rotated shape')
  }
})

// Check adjacent helical centre lines at different axial positions, not just the end view.
const centres = members.slice(0, 4).map(member => Array.from({ length: 81 }, (_, row) => {
  const centre = new T.Vector3()
  for (let half = 0; half < 2; half++) {
    const points = member.children[half].geometry.attributes.position
    for (let col = half ? 1 : 0; col <= (half ? 31 : 32); col++) centre.add(new T.Vector3().fromBufferAttribute(points, row * 66 + col))
  }
  return centre.divideScalar(64)
}))
let clearance = Infinity
const layAngles = centres[0].map(point => Math.atan2(point.z, point.x))
let sweep = 0
for (let i = 1; i < layAngles.length; i++) sweep += T.MathUtils.euclideanModulo(layAngles[i] - layAngles[i - 1] + Math.PI, Math.PI * 2) - Math.PI
assert.ok(sweep > Math.PI / 4 && sweep < Math.PI * .6, 'The assembled bunch has a gentle, approximately quarter-turn lay')
for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) for (const pa of centres[a]) for (const pb of centres[b]) clearance = Math.min(clearance, pa.distanceTo(pb) - .293 * 2)
assert.ok(clearance > 0, `Insulated helices must not intersect: ${clearance}`)
const barePositions = members[4].children[0].geometry.attributes.position
const barePath = Array.from({ length: 101 }, (_, row) => {
  const centre = new T.Vector3()
  for (let col = 0; col < 12; col++) centre.add(new T.Vector3().fromBufferAttribute(barePositions, row * 12 + col))
  return centre.divideScalar(12)
})
for (const point of barePath) assert.ok(Math.hypot(point.x, point.z) > .63, 'The bare messenger follows the outside of the bunch, never its centre')
for (const path of centres) for (const insulated of path) for (const bare of barePath) assert.ok(insulated.distanceTo(bare) > .293 + .119, 'The outside bare helix clears each insulated member')

function closed(geometry) {
  const points = geometry.attributes.position, normals = geometry.attributes.normal
  const edges = new Map()
  const key = index => [points.getX(index), points.getY(index), points.getZ(index)].map(value => Math.round(value * 100000)).join(',')
  for (const array of [points.array, normals.array]) for (const value of array) assert.ok(Number.isFinite(value), 'No invalid positions or lighting normals')
  for (let index = 0; index < geometry.index.count; index += 3) {
    const triangle = [0, 1, 2].map(offset => key(geometry.index.getX(index + offset)))
    assert.equal(new Set(triangle).size, 3, 'No collapsed triangle')
    for (let edge = 0; edge < 3; edge++) {
      const id = [triangle[edge], triangle[(edge + 1) % 3]].sort().join('|')
      edges.set(id, (edges.get(id) || 0) + 1)
    }
  }
  assert.ok([...edges.values()].every(count => count === 2), 'Strand tips, insulation thickness and split rims form closed solids')
}
meshes.forEach(mesh => closed(mesh.geometry))
const started = performance.now()
for (const value of [.4, .75, 1, .75, .4, 0]) {
  model.separate(value)
  for (const mesh of meshes) assert.ok(mesh.geometry.boundingSphere.radius > 0 && Number.isFinite(mesh.geometry.boundingSphere.radius))
}
meshes.forEach((mesh, index) => assert.deepEqual(mesh.geometry.attributes.position.array, original[index], 'Reverse separation reassembles every vertex without drift'))
model.separate(1)
meshes.forEach(mesh => closed(mesh.geometry))
// The jacket must bend; a translation of an unchanged cylinder is insufficient.
const originalShell = original[0], openedShell = meshes[0].geometry.attributes.position.array
const displacements = []
for (let i = 0; i < openedShell.length; i += 3) displacements.push(Math.hypot(...[0, 1, 2].map(axis => openedShell[i + axis] - originalShell[i + axis])))
assert.ok(Math.max(...displacements) - Math.min(...displacements) > .8)
let geometryDisposed = 0, materialDisposed = 0
meshes.forEach(mesh => mesh.geometry.addEventListener('dispose', () => geometryDisposed++))
const materials = new Set(meshes.flatMap(mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material]))
materials.forEach(material => material.addEventListener('dispose', () => materialDisposed++))
model.dispose()
assert.equal(geometryDisposed, meshes.length)
assert.equal(materialDisposed, materials.size)
console.log(`Geometry passed: four equal insulated members, outside bare messenger, 83 closed strands, solid peeling insulation, ${clearance.toFixed(4)} model-unit minimum jacket clearance, reversible buffers and resource disposal. Six steps plus geometry checks: ${(performance.now() - started).toFixed(0)} ms.`)

const base = (process.env.PCI_BROWSER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
await mkdir('test-results', { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const errors = [], videos = []
async function open(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', ...options })
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (/\.(mp4|webm)(\?|$)/.test(request.url())) videos.push(request.url()) })
  assert.equal((await page.goto(`${base}/products/aerial-bunched-cable/`, { waitUntil: 'domcontentloaded' })).status(), 200)
  return page
}
const canvas = page => page.locator('[data-product-viewer] canvas[data-ready=yes]')
async function screenshot(page, name) {
  await page.waitForTimeout(120)
  return page.locator('[data-product-viewer] canvas').screenshot({ path: `test-results/abc-${name}.png` })
}
try {
  const page = await open()
  await canvas(page).waitFor({ timeout: 30000 })
  const start = await screenshot(page, 'bunched-desktop')
  await page.waitForTimeout(200)
  assert.ok(start.equals(await canvas(page).screenshot()), 'Reduced motion has no automatic spin')
  for (const label of ['Open bunch', 'Peel insulation', 'See strands']) {
    await page.getByRole('button', { name: label, exact: true }).click()
    assert.equal(await page.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed'), 'true')
    assert.equal(start.equals(await screenshot(page, label.toLowerCase().replaceAll(' ', '-'))), false)
  }
  const slider = page.getByLabel('Separate layers', { exact: true })
  await slider.focus(); await page.keyboard.press('Home')
  await page.waitForTimeout(120)
  assert.ok(start.equals(await canvas(page).screenshot()), 'Reverse slider returns to the assembled model')
  await page.getByRole('button', { name: 'End view', exact: true }).click()
  assert.equal(start.equals(await screenshot(page, 'end-view')), false)
  await page.getByRole('button', { name: 'See strands', exact: true }).click()
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.waitForTimeout(120)
  assert.equal(await slider.inputValue(), '0')
  assert.ok(start.equals(await canvas(page).screenshot()), 'Reset restores the view and all geometry after separation and end view')
  const stage = page.getByRole('group', { name: 'AB Cable 3D construction' })
  await stage.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(120)
  assert.equal(start.equals(await canvas(page).screenshot()), false)
  await page.keyboard.press('Home')
  await page.getByRole('button', { name: 'See strands', exact: true }).click()
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
  const violations = await page.evaluate(async () => (await axe.run('[data-product-viewer]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(node => node.target) })))
  assert.deepEqual(violations, [])
  await page.setViewportSize({ width: 720, height: 600 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '200% equivalent layout fits')
  await page.close()

  const mobile = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await canvas(mobile).waitFor()
  await screenshot(mobile, 'bunched-mobile')
  await mobile.getByRole('button', { name: 'See strands', exact: true }).tap()
  await screenshot(mobile, 'strands-mobile')
  await mobile.getByRole('button', { name: 'Reset', exact: true }).tap()
  assert.equal(await mobile.getByLabel('Separate layers', { exact: true }).inputValue(), '0')
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await mobile.close()

  const staticPage = await open({ javaScriptEnabled: false })
  const poster = staticPage.locator('[data-product-viewer] img').first()
  assert.ok(await poster.evaluate(async img => { await img.decode(); return img.naturalWidth > 0 && img.src.includes('aerial-bunched-cable-gentle-twist') }))
  assert.equal(await staticPage.locator('[data-spec-entry]').count(), 6, 'All ABC source rows remain available without JavaScript')
  await staticPage.close()

  const noGPU = await browser.newPage({ reducedMotion: 'reduce' })
  await noGPU.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args) }
  })
  await noGPU.goto(`${base}/products/aerial-bunched-cable/`, { waitUntil: 'domcontentloaded' })
  await noGPU.getByRole('heading', { name: 'Product information.' }).waitFor()
  assert.ok(await noGPU.locator('[data-product-viewer] img').first().evaluate(async img => { await img.decode(); return img.naturalWidth > 0 }))
  assert.equal(await noGPU.getByRole('button', { name: 'See strands', exact: true }).isDisabled(), true)
  await noGPU.close()
  assert.deepEqual(videos, [], 'No raw video requests')
  assert.deepEqual(errors, [])
  console.log('ABC browser checks passed: staged separation, reverse, reset, end view, keyboard, touch, reduced motion, accessibility, narrow layout and static/WebGL fallback.')
} finally { await browser.close() }
