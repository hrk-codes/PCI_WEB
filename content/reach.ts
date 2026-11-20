export const reachEvidence = {
  clientSource:'https://pcicablesindustries.com/clients/',
  clientSnapshot:'content/wordpress.json, clients entry',
  verifiedOn:'2026-11-06',
  stateDirectory:'https://www.dtl.gov.in/content/202_6_stateutgencotranscodiscom.aspx',
  utilityDirectory:'https://www.ipds.gov.in/Form_IPDS_Res/RelatedLink.aspx',
  interpretation:'Client-linked Indian regions inferred from published client organisations. Pins are representative and lines link locations to PCI’s works.',
}
export const reachHub={id:'west-bengal',name:'West Bengal',lat:22.68,lon:88.29,client:'WBSEDCL / WBSETCL / WBPDCL',source:reachEvidence.stateDirectory,coordinateNote:'Approximate manufacturing locality in Dankuni, not a surveyed site coordinate.'}
// Other client-linked Indian states and union territories. The West Bengal hub is shown separately.
export const reachStates = [
  {id:'arunachal-pradesh',name:'Arunachal Pradesh',lat:27.9,lon:94.65,client:'ARPDOP',organisation:'Department of Power, Government of Arunachal Pradesh',source:'https://power.arunachal.gov.in/'},
  {id:'assam',name:'Assam',lat:26.2,lon:92.5,client:'APDCL / AEGCL',organisation:'Assam Power Distribution Company / Assam Electricity Grid Corporation',source:'https://www.apdcl.org/website/About'},
  {id:'bihar',name:'Bihar',lat:25.8,lon:85.5,client:'BSPTCL / BSPGCL',organisation:'Bihar State Power Transmission Company / Bihar State Power Generation Company',source:'https://www.bsptcl.in/'},
  {id:'chhattisgarh',name:'Chhattisgarh',lat:21.3,lon:82.1,client:'CSPDCL',organisation:'Chhattisgarh State Power Distribution Company',source:reachEvidence.stateDirectory},
  {id:'delhi',name:'Delhi',lat:28.65,lon:77.22,client:'Delhi Metro',organisation:'Delhi Metro Rail Corporation',source:'https://delhimetrorail.com/pages/en/corporate/introduction'},
  {id:'gujarat',name:'Gujarat',lat:22.5,lon:71.7,client:'GETCO',organisation:'Gujarat Energy Transmission Corporation',source:reachEvidence.stateDirectory},
  {id:'haryana',name:'Haryana',lat:29.2,lon:76.1,client:'UHBVN / HVNL',organisation:'Uttar Haryana Bijli Vitran Nigam / Haryana Vidyut Prasaran Nigam',source:reachEvidence.stateDirectory},
  {id:'jammu-and-kashmir',name:'Jammu and Kashmir',lat:33.75,lon:75.02,client:'PDDJK',organisation:'Jammu and Kashmir Power Development Department',source:'https://www.india.gov.in/category/housing-local-services/subcategory/electricity-lpg-water/details/website-of-power-development-department-jammu-kashmir'},
  {id:'jharkhand',name:'Jharkhand',lat:23.6,lon:85.3,client:'JBVNL / JUSNL',organisation:'Jharkhand Bijli Vitran Nigam / Jharkhand Urja Sancharan Nigam',source:'https://jusnl.in/'},
  {id:'kerala',name:'Kerala',lat:10.5,lon:76.3,client:'KSEB',organisation:'Kerala State Electricity Board',source:reachEvidence.utilityDirectory},
  {id:'madhya-pradesh',name:'Madhya Pradesh',lat:23.5,lon:78,client:'MPPKVVCL / MPMKVVCL',organisation:'Madhya Pradesh regional power distribution utilities',source:reachEvidence.utilityDirectory},
  {id:'maharashtra',name:'Maharashtra',lat:19.4,lon:75.3,client:'MSEDCL / MSETCL',organisation:'Maharashtra State Electricity Distribution Company / Maharashtra State Electricity Transmission Company',source:'https://www.mahadiscom.in/en/home/'},
  {id:'mizoram',name:'Mizoram',lat:23.2,lon:92.8,client:'Government of Mizoram',organisation:'Government of Mizoram, Power & Electricity Department',source:reachEvidence.utilityDirectory},
  {id:'odisha',name:'Odisha',lat:20.5,lon:84.5,client:'TPNODL / TPCODL',organisation:'TP Northern Odisha Distribution / TP Central Odisha Distribution',source:'https://www.tpnodl.com/'},
  {id:'puducherry',name:'Puducherry',lat:11.94,lon:79.8,client:'Puducherry Electricity Department',organisation:'Electricity Department, Government of Puducherry',source:'https://electricity.py.gov.in/'},
  {id:'punjab',name:'Punjab',lat:30.8,lon:75.4,client:'PSPCL',organisation:'Punjab State Power Corporation',source:'https://www.pspcl.in/'},
  {id:'rajasthan',name:'Rajasthan',lat:26.6,lon:74,client:'AVVNL / JVVNL',organisation:'Ajmer Vidyut Vitran Nigam / Jaipur Vidyut Vitran Nigam',source:reachEvidence.utilityDirectory},
  {id:'uttar-pradesh',name:'Uttar Pradesh',lat:27,lon:80.5,client:'DVVNL / MVVNL',organisation:'Dakshinanchal Vidyut Vitran Nigam / Madhyanchal Vidyut Vitran Nigam',source:reachEvidence.utilityDirectory},
  {id:'tamil-nadu',name:'Tamil Nadu',lat:11.3,lon:78.7,client:'Chennai Metro / TNPDCL',organisation:'Chennai Metro Rail / Tamil Nadu Power Distribution Corporation',source:'https://chennaimetrorail.org/',logoEvidence:'2024/09/Chennai-Metro.png; 2026/09/TNPDCL.png'},
  {id:'karnataka',name:'Karnataka',lat:14.6,lon:76,client:'Bengaluru Metro',organisation:'Bangalore Metro Rail Corporation',source:'https://www.bmrc.co.in/',logoEvidence:'2026/09/Bangaluru-Metro.png'},
  {id:'telangana',name:'Telangana',lat:18.1,lon:79.1,client:'TSGENCO',organisation:'Telangana State Power Generation Corporation, published as TSGENCO',source:reachEvidence.stateDirectory,logoEvidence:'2024/01/TSGENCO.png'},
  {id:'tripura',name:'Tripura',lat:23.8,lon:91.52,client:'TPTL / TSECL',organisation:'Tripura Power Transmission Limited / Tripura State Electricity Corporation Limited',source:'https://tripura.gov.in/sites/default/files/Notification_82.pdf'},
]
type ReachCountry={id:string;name:string;lat:number;lon:number;client:string;milestone?:string;image?:string;source?:string;connectionEvidence?:string}
export const reachExports:ReachCountry[]=[
  {id:'nepal',name:'Nepal',lat:27.7,lon:85.3,client:'NEA Nepal',milestone:'First cable export, October 2022',image:'/media/client-nea-nepal.webp',source:reachEvidence.clientSource},
  {id:'uganda',name:'Uganda',lat:.35,lon:32.6,client:'UETCL Uganda',milestone:'First conductor export, June 2022',image:'/media/client-uetcl-uganda.webp',source:reachEvidence.clientSource},
  {id:'bhutan',name:'Bhutan',lat:27.5,lon:90.4,client:'BPC Bhutan',milestone:'Published international client',image:'/media/client-bpc-bhutan.webp',source:'https://www.bpc.bt/overview/'},
  {id:'nigeria',name:'Nigeria',lat:9.1,lon:7.4,client:'TCN Nigeria',milestone:'Conductor and GSW orders recorded in PCI news',image:'/media/client-tcn-nigeria.webp',source:reachEvidence.clientSource},
  {id:'rwanda',name:'Rwanda',lat:-1.95,lon:30.1,client:'EDCL Rwanda',milestone:'Published international client',image:'/media/client-edcl-rwanda.webp',source:reachEvidence.clientSource},
  {id:'mozambique',name:'Mozambique',lat:-18.7,lon:35.5,client:'EDM Mozambique',milestone:'Published international client',image:'/media/client-edm-mozambique.webp',source:'https://www.edm.co.mz/'},
  {id:'philippines',name:'Philippines',lat:14.6,lon:121,client:'Linxon Philippines',milestone:'Published international client',image:'/media/client-linxon-philippines.webp',source:'https://linxon.com/project/traction-power-supply-distribution-and-1500-v-dc-overhead-catenary-system-manila-philippines/'},
  {id:'angola',name:'Angola',lat:-11.2,lon:17.8,client:'International destination',connectionEvidence:'Destination supplied for this site update. Client, order and date unspecified.'},
  {id:'liberia',name:'Liberia',lat:6.55,lon:-9.52,client:'Liberia Electricity Corporation',source:'https://lecliberia.com/',connectionEvidence:'PCI Cables company profile, page 1: https://cdn3.f-cdn.com/files/download/207408387/booklet.pdf'},
]
export const reachIndiaCount=reachStates.length+1
export type ReachState={view:'world'|'india';selected:string|null;preview:string|null;paused:boolean;reduced:boolean;interacting:boolean}
