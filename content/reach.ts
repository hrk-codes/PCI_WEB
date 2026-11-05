export const reachEvidence = {
  clientSource:'https://pcicablesindustries.com/clients/',
  clientSnapshot:'content/wordpress.json, clients entry',
  verifiedOn:'2026-11-05',
  stateDirectory:'https://www.dtl.gov.in/content/202_6_stateutgencotranscodiscom.aspx',
  utilityDirectory:'https://www.ipds.gov.in/Form_IPDS_Res/RelatedLink.aspx',
  interpretation:'Client-linked states inferred from published client organisations. Pins represent states, not delivery sites. Arcs are relationships, not transport routes.',
}
export const reachHub={id:'west-bengal',name:'Dankuni, West Bengal',lat:22.68,lon:88.29,coordinateNote:'Approximate manufacturing locality, not a surveyed site coordinate.'}
export const reachStates = [
  {id:'assam',name:'Assam',lat:26.2,lon:92.5,client:'APDCL / AEGCL',organisation:'Assam Power Distribution Company / Assam Electricity Grid Corporation',source:'https://www.apdcl.org/website/About'},
  {id:'bihar',name:'Bihar',lat:25.8,lon:85.5,client:'BSPTCL / BSPGCL',organisation:'Bihar State Power Transmission Company / Bihar State Power Generation Company',source:'https://www.bsptcl.in/'},
  {id:'chhattisgarh',name:'Chhattisgarh',lat:21.3,lon:82.1,client:'CSPDCL',organisation:'Chhattisgarh State Power Distribution Company',source:reachEvidence.stateDirectory},
  {id:'gujarat',name:'Gujarat',lat:22.5,lon:71.7,client:'GETCO',organisation:'Gujarat Energy Transmission Corporation',source:reachEvidence.stateDirectory},
  {id:'haryana',name:'Haryana',lat:29.2,lon:76.1,client:'UHBVN / HVNL',organisation:'Uttar Haryana Bijli Vitran Nigam / Haryana Vidyut Prasaran Nigam',source:reachEvidence.stateDirectory},
  {id:'jharkhand',name:'Jharkhand',lat:23.6,lon:85.3,client:'JBVNL / JUSNL',organisation:'Jharkhand Bijli Vitran Nigam / Jharkhand Urja Sancharan Nigam',source:'https://jusnl.in/'},
  {id:'kerala',name:'Kerala',lat:10.5,lon:76.3,client:'KSEB',organisation:'Kerala State Electricity Board',source:reachEvidence.utilityDirectory},
  {id:'madhya-pradesh',name:'Madhya Pradesh',lat:23.5,lon:78,client:'MPPKVVCL / MPMKVVCL',organisation:'Madhya Pradesh regional power distribution utilities',source:reachEvidence.utilityDirectory},
  {id:'maharashtra',name:'Maharashtra',lat:19.4,lon:75.3,client:'MSEDCL / MSETCL',organisation:'Maharashtra State Electricity Distribution Company / Maharashtra State Electricity Transmission Company',source:'https://www.mahadiscom.in/en/home/'},
  {id:'mizoram',name:'Mizoram',lat:23.2,lon:92.8,client:'Government of Mizoram',organisation:'Government of Mizoram, Power & Electricity Department',source:reachEvidence.utilityDirectory},
  {id:'odisha',name:'Odisha',lat:20.5,lon:84.5,client:'TPNODL / TPCODL',organisation:'TP Northern Odisha Distribution / TP Central Odisha Distribution',source:'https://www.tpnodl.com/'},
  {id:'punjab',name:'Punjab',lat:30.8,lon:75.4,client:'PSPCL',organisation:'Punjab State Power Corporation',source:'https://www.pspcl.in/'},
  {id:'rajasthan',name:'Rajasthan',lat:26.6,lon:74,client:'AVVNL / JVVNL',organisation:'Ajmer Vidyut Vitran Nigam / Jaipur Vidyut Vitran Nigam',source:reachEvidence.utilityDirectory},
  {id:'uttar-pradesh',name:'Uttar Pradesh',lat:27,lon:80.5,client:'DVVNL / MVVNL',organisation:'Dakshinanchal Vidyut Vitran Nigam / Madhyanchal Vidyut Vitran Nigam',source:reachEvidence.utilityDirectory},
]
export const reachExports=[{id:'nepal',name:'Nepal',lat:27.7,lon:85.3,client:'NEA Nepal',milestone:'First cable export, October 2022'},{id:'uganda',name:'Uganda',lat:.35,lon:32.6,client:'UETCL Uganda',milestone:'First conductor export, June 2022'}]
export type ReachState={view:'world'|'india';selected:string|null;preview:string|null;paused:boolean;reduced:boolean;interacting:boolean}
