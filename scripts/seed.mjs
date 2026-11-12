import { getPayload } from 'payload'
import { readFile } from 'node:fs/promises'
import config from '../payload.config.ts'
const read = async (file) => JSON.parse(await readFile(file, 'utf8'))
const payload = await getPayload({ config })
const docs = await read('content/wordpress.json')
const descriptions = {
  products:['Explore the product range.','Find cables, overhead conductors and earth wire for power distribution, transmission and industrial projects.'],
  cables:['Cables','Explore PCI’s power, control and service cables, including aerial bunched cable and LT XLPE cable.'],
  conductors:['Overhead conductors','Compare PCI’s stranded aluminium, aluminium alloy and reinforced conductor families.'],
  'earth-wire':['Earth wire','Explore galvanised steel earth wire for power networks.'],
  'contact-us':['Contact PCI Cables','Reach our sales, purchasing and HR teams or visit our registered office and works in Dankuni.'],
  'vendor-registration':['Vendor registration','Introduce your company and the products or services you supply to PCI’s procurement team.'],
  career:['Careers at PCI Cables','Tell us about your area of interest and how you’d like to contribute.'],
  blog:['Stories and updates','Events, project news and manufacturing updates from PCI Cables.'],
  news:['PCI Cables news','Company milestones, product developments and industry events.'],
  turnover:['Company turnover','PCI Cables’ published financial year turnover from 2015–16 through 2024–25.'],
}
for (const doc of docs) if (descriptions[doc.slug]) [doc.title,doc.summary] = descriptions[doc.slug]
const catalogue = await read('content/catalogue.json')
docs.push(...catalogue.map(p => ({ slug: 'product:'+p.slug, title: p.name, summary: p.summary, kind: 'product', html: '' })))
docs.push({ slug: 'home', title: 'Engineered to carry the current.', summary: 'Cables, overhead conductors and earth wire from Dankuni, made for power networks across India and beyond.', kind: 'home', html: '' })
for (const doc of docs) {
  if ((await payload.count({ collection: 'site-content', where: { slug: { equals: doc.slug } } })).totalDocs) continue
  const { slug, title, summary, kind, html } = doc
  await payload.create({ collection: 'site-content', data: { slug, title, summary: summary || title, kind, html, published: true } })
}
console.log('Seeded public content; existing staff edits were preserved.')
await payload.destroy()
process.exit(0)
