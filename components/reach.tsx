import { Ambient } from '@/components/ambient'
import { Kicker, TextLink } from '@/components/site'
import { ReachExplorer } from '@/components/reach-explorer'
import { reachExports } from '@/content/reach'

export function Reach(){
  return <section className="section reach reach-earth ambient-host" aria-labelledby="reach-heading"><Ambient className="ambient-dark"/><div className="wrap reach-layout"><div className="reach-intro"><Kicker>Our reach</Kicker><h2 id="reach-heading">From West Bengal to wider horizons.</h2><p>Manufacturing in Dankuni. Connecting power networks across India, with international client reach across Asia and Africa.</p><TextLink href="/achievements/">Explore our milestones</TextLink><div className="reach-origin"><span aria-hidden="true"/><div><strong>Dankuni, West Bengal</strong><small>PCI manufacturing and works</small></div></div><div className="reach-export-notes"><span>INTERNATIONAL CLIENT REACH</span><p className="reach-countries">{reachExports.map(s=>s.name).join(' · ')}</p></div></div><ReachExplorer/></div></section>
}
