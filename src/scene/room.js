import * as THREE from 'three';
import {ZONES,SHELL_OUT,TUBE_R,TUBE_X,TUBE_LEN} from '../config/geometry.js';
import {mergeStaticDrawCalls} from './merge-static.js';

/**
 * Distant, low-poly silhouettes of the *same* instruments shown in detailed
 * views, not generic placeholder machinery. Keep the outer shell proportions,
 * actual frame contact points and major attached assemblies. Do not reproduce
 * the internals, bolts, hoses, heaters or process animations here.
 *
 * These proxies only appear when their detailed station is hidden. All parts
 * remain within the single shared room and are rigid enough to batch safely.
 */
export const BAYS=Object.freeze({
 lpe:{x:0,name:'Liquid phase epitaxy'},
 imm:{x:16,name:'Ion beam mill'},
 mbe:{x:30,name:'Molecular beam epitaxy'},
 cmp:{x:46,name:'Chemical mechanical planarization'}
});

export function buildRoom(scene,{batchProxies=true}={}){
 const room=new THREE.Group();
 room.name='Foundry room';
 scene.add(room);

 const dark=new THREE.MeshStandardMaterial({color:0x172431,metalness:.65,roughness:.62});
 const steel=new THREE.MeshStandardMaterial({color:0x596a7a,metalness:.75,roughness:.42});
 const pale=new THREE.MeshStandardMaterial({color:0x8b9cab,metalness:.70,roughness:.46});
 const shell=new THREE.MeshStandardMaterial({color:0x6c737c,metalness:.80,roughness:.58});
 const ceramic=new THREE.MeshStandardMaterial({color:0xb5b3aa,metalness:.05,roughness:.85});
 const copper=new THREE.MeshStandardMaterial({color:0x85654c,metalness:.66,roughness:.48});

 const box=(parent,name,w,h,d,material,x,y,z)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.name=name;
  mesh.position.set(x,y,z);
  parent.add(mesh);
  return mesh;
 };
 const cylinder=(parent,name,rt,rb,h,material,x,y,z,segments=14,axis='y')=>{
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);
  mesh.name=name;
  mesh.position.set(x,y,z);
  if(axis==='x')mesh.rotation.z=Math.PI/2;
  if(axis==='z')mesh.rotation.x=Math.PI/2;
  parent.add(mesh);
  return mesh;
 };
 const hoop=(parent,name,r,tube,material,x,y,z,axis='y')=>{
  const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,tube,5,18),material);
  mesh.name=name;
  mesh.position.set(x,y,z);
  if(axis==='x')mesh.rotation.y=Math.PI/2;
  else if(axis==='y')mesh.rotation.x=Math.PI/2;
  parent.add(mesh);
  return mesh;
 };

 // One room-wide backdrop, floor and bay outlines, not duplicated rooms.
 const back=box(room,'room-rear-wall',88,11,.18,dark,24.5,5.5,-9.8);
 back.material=new THREE.MeshStandardMaterial({
   color:0x101a26,roughness:.85,metalness:.15,
   transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide
 });
 for(const x of [-10,9,23,40,57])
  box(room,'room-wall-support',.15,10.5,.22,steel,x,5.25,-9.4);

 const proxies={},proxyStats={};
 for(const [key,bay] of Object.entries(BAYS)){
  const w=key==='lpe'?13:8;
  const slab=box(room,key+'-bay-floor',w,.07,8,dark,bay.x,.035,0);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry),
   new THREE.LineBasicMaterial({color:0x315675,transparent:true,opacity:.8}));
  edges.position.copy(slab.position);
  edges.name=key+'-bay-outline';
  room.add(edges);
  const group=new THREE.Group();
  group.name=bay.name+' (room silhouette)';
  group.position.x=bay.x;
  room.add(group);
  proxies[key]=group;
 }

 // LPE: four 2.30-unit furnace zones, 1.65-unit OUTER RADIUS, as in lpe.js.
 // Detailed furnace center is at y=2.65 and four posts meet the y=1.36 rails.
 {
  const p=proxies.lpe,center=2.65;
  for(let i=0;i<ZONES.length;i++){
   const z=ZONES[i];
   cylinder(p,'lpe-zone-'+i,SHELL_OUT,SHELL_OUT,z.len,
     shell,z.x,center,0,18,'x');
   // Thin seams convey four zones, rather than an unrelated striped tube.
   if(i<ZONES.length-1)
    hoop(p,'lpe-zone-joint',SHELL_OUT+.015,.045,steel,z.x+z.len/2+.025,center,0,'x');
  }
  for(const sign of [-1,1]){
   const end=sign*(ZONES.at(-1).x+ZONES.at(-1).len/2);
   cylinder(p,'lpe-insulation-flange',SHELL_OUT+.05,SHELL_OUT+.05,.11,
      pale,end,center,0,18,'x');
  }
  // Only the glass process tube protrudes beyond the furnace insulation.
  cylinder(p,'lpe-quartz-process-tube',TUBE_R,TUBE_R,TUBE_LEN,
    ceramic,0,center,0,12,'x');
  for(const sign of [-1,1]){
   cylinder(p,'lpe-end-vacuum-fitting',.60,.60,.22,
    pale,sign*TUBE_X,center,0,14,'x');
   cylinder(p,'lpe-end-cap',.46,.46,.15,steel,
    sign*(TUBE_X+.16),center,0,12,'x');
  }
  // Exactly the four floor-level posts and two longitudinal rails of
  // the detailed furnace, not generic legs stopping below the shell.
  for(const x of [-4.55,4.55]){
   for(const z of [-.70,.70]){
    box(p,'lpe-frame-leg',.13,1.29,.13,steel,x,.645,z);
    cylinder(p,'lpe-frame-foot',.18,.20,.06,dark,x,.03,z,8);
   }
   box(p,'lpe-frame-crossmember',.12,.12,1.55,steel,x,1.29,0);
  }
  for(const z of [-.70,.70])
   box(p,'lpe-frame-longitudinal-rail',9.25,.14,.14,steel,0,1.36,z);
  // Subtle support cradles at the same x coordinates as the real saddles.
  for(const x of [-3.5,3.5]){
   box(p,'lpe-furnace-cradle',.20,.28,2.60,pale,x,1.29,0);
   hoop(p,'lpe-saddle-outline',SHELL_OUT+.03,.055,pale,x,center,0,'x');
  }
  p.userData.silhouette={
   source:'lpe.js',shellRadius:SHELL_OUT,centerY:center,
   zoneCount:ZONES.length,frameLegCount:4,frameGroundY:0,
   detailedFrameTopY:1.36,processTubeLength:TUBE_LEN
  };
 }

 // Ion mill: chamber bottom y=1.7, radius 1.8, frame at ±2.2 x/z.
 // The source, load lock and vacuum pump need mechanical connections.
 {
  const p=proxies.imm,center=3.4,chamberBottom=1.7;
  cylinder(p,'imm-chamber',1.8,1.8,3.4,pale,0,center,0,18);
  for(const y of [1.7,5.1])
   cylinder(p,'imm-chamber-flange',1.90,1.90,.12,steel,0,y,0,18);
  hoop(p,'imm-support-collar',1.9,.09,steel,0,chamberBottom-.01,0);
  for(const x of [-2.2,2.2]){
   for(const z of [-2.2,2.2]){
    box(p,'imm-frame-leg',.16,1.64,.16,steel,x,.88,z);
    cylinder(p,'imm-floor-foot',.19,.22,.06,dark,x,.03,z,8);
   }
   box(p,'imm-floor-skid',.26,.16,4.65,dark,x,.08,0);
   box(p,'imm-longitudinal-tie',.11,.11,4.40,steel,x,1.40,0);
  }
  for(const z of [-2.2,2.2])
   box(p,'imm-cross-frame',4.50,.11,.11,steel,0,1.40,z);
  // Four short radial arms meet the outer frame corners at the lower collar.
  for(const x of [-2.2,2.2])for(const z of [-2.2,2.2]){
   const radial=new THREE.Vector3(x,0,z),r=radial.length();
   const inside=new THREE.Vector3(x*1.90/r,1.70,z*1.90/r);
   const outside=new THREE.Vector3(x,1.70,z);
   const delta=outside.clone().sub(inside);
   const arm=box(p,'imm-collar-frame-bracket',delta.length(),.12,.12,steel,
      (inside.x+outside.x)/2,1.70,(inside.z+outside.z)/2);
   arm.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),delta.normalize());
  }
  // Top source is joined by the neutralizer/neck, not hovering above it.
  cylinder(p,'imm-source-neck',.70,.70,.92,steel,0,5.48,0,14);
  cylinder(p,'imm-ion-source',.75,.75,.60,dark,0,6.10,0,16);
  cylinder(p,'imm-source-cap',.85,.85,.12,steel,0,6.45,0,16);
  // Attached side load lock; vertical post and cross-brace carry its weight.
  cylinder(p,'imm-load-lock',.40,.40,.60,steel,2.20,center,0,12,'x');
  cylinder(p,'imm-load-lock-flange',.47,.47,.10,pale,1.94,center,0,12,'x');
  box(p,'imm-load-lock-post',.14,1.50,.14,steel,2.45,2.27,0);
  box(p,'imm-load-lock-brace',1.14,.12,.12,steel,2.15,1.63,0);
  // A pump block/pedestal beneath the bottom chamber flange.
  box(p,'imm-pump-pedestal',1.30,.55,1.34,dark,0,.275,0);
  cylinder(p,'imm-turbo-base',.35,.30,.23,dark,0,.665,0,12);
  cylinder(p,'imm-turbo-pump',.45,.45,.55,steel,0,1.05,0,12);
  cylinder(p,'imm-pump-neck',.37,.37,.40,pale,0,1.52,0,10);
  // Front vacuum viewport, recognizable without interior plasma effects.
  cylinder(p,'imm-viewport',.32,.32,.22,steel,0,3.7,1.83,12,'z');
  p.userData.silhouette={
   source:'ion-mill.js',chamberRadius:1.8,chamberBottomY:chamberBottom,
   frameLegCount:4,frameGroundY:.06,loadLockSupported:true,
   turboSupported:true,sourceConnected:true
  };
 }

 // MBE: radius 1.5 UHV chamber from y=2 to 5.3, tapered top to 5.9,
 // supported by the four ±2.0/±1.9 posts and lower vacuum frame.
 {
  const p=proxies.mbe;
  cylinder(p,'mbe-uhv-chamber',1.5,1.5,3.3,pale,0,3.65,0,18);
  cylinder(p,'mbe-tapered-top',.75,1.5,.60,steel,0,5.60,0,18);
  cylinder(p,'mbe-top-flange',.85,.85,.12,pale,0,5.93,0,16);
  cylinder(p,'mbe-rotary-shaft',.10,.10,.90,steel,0,6.43,0,10);
  cylinder(p,'mbe-manipulator-motor',.34,.34,.40,dark,0,7.05,0,12);
  cylinder(p,'mbe-motor-cap',.26,.33,.10,pale,0,7.32,0,12);
  cylinder(p,'mbe-lower-flange',1.65,1.65,.10,steel,0,2.00,0,18);
  hoop(p,'mbe-support-collar',1.65,.08,pale,0,1.94,0);
  for(const x of [-2,2]){
   for(const z of [-1.9,1.9]){
    box(p,'mbe-frame-leg',.14,1.92,.14,steel,x,.96,z);
    cylinder(p,'mbe-floor-foot',.19,.22,.06,dark,x,.03,z,8);
   }
   box(p,'mbe-frame-end-tie',.11,.10,3.8,steel,x,1.45,0);
  }
  for(const z of [-1.9,1.9])
   box(p,'mbe-frame-side-rail',4.14,.10,.11,steel,0,1.45,z);
  // Brackets from the lower UHV collar to each corner: no hanging vessel.
  for(const x of [-2,2])for(const z of [-1.9,1.9]){
    const radial=new THREE.Vector3(x,0,z),r=radial.length();
    const inside=new THREE.Vector3(x*1.65/r,1.94,z*1.65/r);
    const outside=new THREE.Vector3(x,1.94,z);
    const delta=outside.clone().sub(inside);
    const arm=box(p,'mbe-collar-frame-bracket',delta.length(),.10,.10,steel,
      (inside.x+outside.x)/2,1.94,(inside.z+outside.z)/2);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),delta.normalize());
  }
  // External vacuum ports are visible; K-cells stay INSIDE the opaque
  // chamber, rather than an unexplained block below the vessel.
  cylinder(p,'mbe-side-flange',.29,.29,.33,steel,1.60,3.0,0,12,'x');
  cylinder(p,'mbe-side-flange',.29,.29,.33,steel,-1.60,3.0,0,12,'x');
  cylinder(p,'mbe-front-view-port',.34,.34,.25,copper,0,4.45,1.55,12,'z');
  p.userData.silhouette={
   source:'mbe/scene.js',chamberRadius:1.5,chamberBottomY:2.0,
   taperedTop:true,frameLegCount:4,frameGroundY:0,
   supportCollarY:1.94,topManipulator:true
  };
 }

 // CMP has a grounded tool bench, polishing pad and supported carrier gantry.
 {
  const p=proxies.cmp;
  box(p,'cmp-table-top',6.5,.12,6.5,steel,0,1.04,0);
  for(const x of [-2.85,2.85])for(const z of [-2.85,2.85])
   box(p,'cmp-table-leg',.19,.99,.19,dark,x,.495,z);
  box(p,'cmp-lower-shelf',6.2,.10,6.2,dark,0,.35,0);
  cylinder(p,'cmp-catch-tray',2.85,2.85,.18,pale,0,1.22,0,20);
  cylinder(p,'cmp-platen-and-pad',2.02,2.02,.24,dark,0,1.57,0,20);
  cylinder(p,'cmp-offset-carrier',.60,.60,.36,pale,1,2.38,0,16);
  cylinder(p,'cmp-carrier-shaft',.13,.13,1.35,steel,1,3.22,0,12);
  cylinder(p,'cmp-carrier-motor',.30,.30,.40,dark,1,4.05,0,12);
  for(const x of [-2.7,2.7])
   box(p,'cmp-overhead-post',.20,3.78,.20,steel,x,2.97,-2.45);
  box(p,'cmp-overhead-beam',5.60,.20,.24,steel,0,4.87,-2.45);
  box(p,'cmp-head-support',.23,.16,2.55,pale,1,4.87,-1.20);
  box(p,'cmp-slurry-support',.15,1.8,.15,pale,2.45,2,1.4);
  box(p,'cmp-slurry-arm',2,.12,.15,pale,1.55,2.87,1.4);
  box(p,'cmp-conditioner-support',.15,1.8,.15,pale,-2.45,2,.8);
  box(p,'cmp-conditioner-arm',2,.12,.15,pale,-1.60,2.87,.8);
  p.userData.silhouette={
   source:'cmp/scene.js',tableTopY:1.10,tableWidth:6.5,
   floorLegCount:4,overheadAnchored:true,platenRadius:2.02,carrierOffset:1
  };
 }

 // The four previews are fully static, so equivalent-material rigid meshes
 // can be submitted as far fewer GPU draws without losing any triangles.
 for(const [key,p] of Object.entries(proxies)){
  p.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  proxyStats[key]=batchProxies?mergeStaticDrawCalls(p):null;
 }

 return {
  room,proxies,proxyStats,
  setFocus(active){
   for(const [key,p] of Object.entries(proxies))p.visible=key!==active;
  }
 };
}
