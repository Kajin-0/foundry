import * as THREE from 'three';

// All three machines inhabit one coordinate system. Detailed station meshes
// are enabled only for the chosen bay; distant stations use low-poly stand-ins.
export const BAYS = Object.freeze({
 lpe:{x:0, name:'Liquid phase epitaxy'},
 imm:{x:16, name:'Ion beam mill'},
 mbe:{x:30, name:'Molecular beam epitaxy'}
});
export function buildRoom(scene){
 const room = new THREE.Group();
 room.name='Foundry room';
 scene.add(room);
 const dark=new THREE.MeshStandardMaterial({color:0x172431,metalness:.65,roughness:.62});
 const steel=new THREE.MeshStandardMaterial({color:0x596a7a,metalness:.75,roughness:.42});
 const pale=new THREE.MeshStandardMaterial({color:0x8b9cab,metalness:.7,roughness:.46});
 const copper=new THREE.MeshStandardMaterial({color:0x85654c,metalness:.66,roughness:.48});
 const marker=new THREE.MeshBasicMaterial({color:0x326089});
 const proxies={};
 const cyl=(rt,rb,h,m,seg=12)=>new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m);
 const cube=(w,h,d,m)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
 // One common architectural backdrop; no per-bay duplicate floors/lights.
 const back=cube(57,11,.18,dark);
 back.position.set(14,5.5,-9.8);
 back.material=new THREE.MeshStandardMaterial({color:0x101a26,roughness:.85,metalness:.15,transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide});
 room.add(back);
 for(const x of [-10,9,23,40]){
  const support=cube(.15,10.5,.22,steel);
  support.position.set(x,5.25,-9.4);room.add(support);
 }
 for(const [key,bay] of Object.entries(BAYS)){
  const platform=cube(key==='lpe'?13:8,.07,8,dark);
  platform.position.set(bay.x,.03,0);room.add(platform);
  const border=new THREE.LineSegments(
   new THREE.EdgesGeometry(new THREE.BoxGeometry(key==='lpe'?13:8,.075,8)),
   new THREE.LineBasicMaterial({color:0x315675,transparent:true,opacity:.8}));
  border.position.copy(platform.position);room.add(border);
  const p=new THREE.Group();p.position.set(bay.x,0,0);p.name=bay.name+' (distant representation)';
  room.add(p);proxies[key]=p;
 }
 // LPE long horizontal insulated tube with furnace base.
 {
  const p=proxies.lpe;
  const c=cyl(.87,.87,10.0,steel,14);c.rotation.z=Math.PI/2;c.position.y=2.75;p.add(c);
  for(const x of [-4,-2,0,2,4]){const ring=cyl(.96,.96,.22,copper,14);ring.rotation.z=Math.PI/2;ring.position.set(x,2.75,0);p.add(ring);}
  for(const x of [-4,4]){const leg=cube(.22,1.9,.28,dark);leg.position.set(x,1,0);p.add(leg);}
 }
 // Ion mill: vertical cylindrical process chamber and upper ion source.
 {
  const p=proxies.imm;
  const body=cyl(1.75,1.75,3.4,steel,18);body.position.y=3.4;p.add(body);
  for(const y of [1.65,5.15]){const fl=cyl(1.85,1.85,.16,pale,18);fl.position.y=y;p.add(fl);}
  const source=cyl(.74,.96,1.1,dark,14);source.position.y=5.85;p.add(source);
  // The distance-view placeholder must also look mounted on a real stand.
  for(const x of [-1.6,1.6])for(const z of [-1.6,1.6]){
    const leg=cube(.18,1.8,.18,steel);
    leg.position.set(x,.9,z);p.add(leg);
  }
  for(const z of [-1.6,1.6]){
    const rail=cube(3.38,.13,.14,dark);
    rail.position.set(0,1.70,z);p.add(rail);
  }
  const skid=cube(3.7,.15,3.7,dark);skid.position.y=.075;p.add(skid);
  const support=cyl(1.80,1.80,.12,pale,16);support.position.y=1.67;p.add(support);
 }
 // MBE: UHV chamber, tapered manipulator flange and low source block.
 {
  const p=proxies.mbe;
  const body=cyl(1.48,1.48,3.35,pale,18);body.position.y=3.65;p.add(body);
  const neck=cyl(.75,1.48,.7,steel,18);neck.position.y=5.65;p.add(neck);
  const shaft=cyl(.22,.22,1.1,dark,12);shaft.position.y=6.5;p.add(shaft);
  const source=cyl(1.2,1.15,.65,copper,16);source.position.y=1.85;p.add(source);
  for(const x of [-1.7,1.7]){const leg=cube(.15,1.5,.15,steel);leg.position.set(x,.75,0);p.add(leg);}
 }
 for(const p of Object.values(proxies)){
  p.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
 }
 return {room,proxies,setFocus(active){
   for(const [key,p] of Object.entries(proxies))p.visible=key!==active;
 }};
}
