import {mkdir,writeFile} from 'node:fs/promises'
const base='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
async function get(name){const r=await fetch(base+name);if(!r.ok)throw new Error(name+': '+r.status);return r.json()}
const [land,countries]=await Promise.all([get('ne_50m_land.geojson'),get('ne_10m_admin_0_countries_ind.geojson')])
const india=countries.features.find(f=>f.properties.ADM0_A3==='IND')
if(!india)throw new Error('India perspective geometry not found')
function simplify(points,tolerance){
  if(points.length<=4)return points
  const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]]
  while(stack.length){
    const [a,b]=stack.pop(),p=points[a],q=points[b]
    let distance=tolerance*tolerance,index=-1
    for(let i=a+1;i<b;i++){
      const x=points[i],dx=q[0]-p[0],dy=q[1]-p[1]
      const t=dx||dy?Math.max(0,Math.min(1,((x[0]-p[0])*dx+(x[1]-p[1])*dy)/(dx*dx+dy*dy))):0
      const d=(x[0]-p[0]-t*dx)**2+(x[1]-p[1]-t*dy)**2
      if(d>distance){distance=d;index=i}
    }
    if(index>=0){keep.add(index);stack.push([a,index],[index,b])}
  }
  const result=[...keep].sort((a,b)=>a-b).map(i=>points[i].map(n=>Number(n.toFixed(3))))
  return result.length>=4?result:points.map(p=>p.map(n=>Number(n.toFixed(3))))
}
function polygons(geometry,tolerance){return (geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates).map(poly=>poly.map(ring=>simplify(ring,tolerance)))}
const data={source:'Natural Earth; ne_50m_land and ne_10m_admin_0_countries_ind',license:'Public domain',land:land.features.flatMap(f=>polygons(f.geometry,.055)),india:polygons(india.geometry,.012)}
await mkdir('public/geography',{recursive:true})
await writeFile('public/geography/earth.json',JSON.stringify(data))
console.log('Saved locally hosted Earth geometry:',data.land.length,'land polygons;',data.india.length,'India polygons')
