import { Ambient } from '@/components/ambient'
import { Kicker, TextLink } from '@/components/site'
import { ReachExplorer } from '@/components/reach-explorer'

export function Reach(){
  return <section className="section reach reach-earth ambient-host" aria-labelledby="reach-heading"><Ambient className="ambient-dark"/><div className="wrap reach-layout"><div className="reach-intro"><Kicker>Our reach</Kicker><h2 id="reach-heading">From West Bengal to wider horizons.</h2><p>Manufacturing in Dankuni. Supplying power networks in India and recording early export milestones in Uganda and Nepal.</p><TextLink href="/achievements/">Explore our milestones</TextLink><div className="reach-origin"><span aria-hidden="true"/><div><strong>Dankuni, West Bengal</strong><small>PCI manufacturing and works</small></div></div><div className="reach-export-notes"><span>FIRST EXPORT MILESTONES</span><div><strong>Nepal</strong><small>Cables · October 2022</small></div><div><strong>Uganda</strong><small>Conductors · June 2022</small></div></div></div><ReachExplorer/></div></section>
}
