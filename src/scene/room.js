import * as THREE from 'three';
import {ZONES,SHELL_OUT,TUBE_R,TUBE_X,TUBE_LEN} from '../config/geometry.js';
import {mergeStaticDrawCalls} from './merge-static.js';
import {calculateRoomLayout,LAB_GRID_PITCH} from './room-layout.js';

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
 cmp:{x:46,name:'Chemical mechanical planarization'},
 litho:{x:62,name:'ArF immersion photolithography'},
 spin:{x:78,name:'Photoresist spin coater',width:8},
 implant:{x:94,name:'Ion implanter',width:11}
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

 // Shared ground/grid scale with the outer equipment footprints. These
 // are only TWO draw submissions regardless of how many bays are added:
 // the plane has two triangles; the grid is one batched line object.
 const layout=calculateRoomLayout(BAYS);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(layout.floorSize,layout.floorSize),
  new THREE.MeshStandardMaterial({color:0x121a24,roughness:.72,metalness:.35}));
 floor.name='room-ground-plane';
 floor.rotation.x=-Math.PI/2;floor.position.x=layout.centerX;
 floor.receiveShadow=true;
 room.add(floor);
 const grid=new THREE.GridHelper(layout.gridSize,layout.gridDivisions,0x28445f,0x172535);
 grid.name='room-continuous-grid';
 grid.position.set(layout.centerX,.003,0);
 grid.material.transparent=true;grid.material.opacity=.48;
 room.add(grid);

 // Single fog-dissolved rear wall. Width, center and the framing rails are
 // derived from the real bays; the fourth station no longer overhangs it.
 const wall=box(room,'room-rear-wall',layout.wallWidth,11,.18,dark,
  (layout.wallMinX+layout.wallMaxX)/2,5.5,-9.8);
 // An opaque wall approximates the previous 72%-opacity composition while
 // avoiding a screen-sized transparent draw/overdraw on modest GPUs.
 wall.material=new THREE.MeshBasicMaterial({color:0x15212e,fog:true,side:THREE.DoubleSide});
 for(let x=layout.wallMinX+12;x<layout.wallMaxX-3;x+=15)
  box(room,'room-wall-support',.15,10.5,.22,steel,x,5.25,-9.4);

 const proxies={},proxyStats={},outlines={},slabs={};
 for(const [key,bay] of Object.entries(BAYS)){
  const w=bay.width??(key==='lpe'?13:8);
  const slab=box(room,key+'-bay-floor',w,.07,8,dark,bay.x,.035,0);
  slabs[key]=slab;
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry),
   new THREE.LineBasicMaterial({color:0x315675,transparent:true,opacity:.8}));
  edges.position.copy(slab.position);
  edges.name=key+'-bay-outline';
  edges.userData.bayKey=key;outlines[key]=edges;
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

 // Fifth bay: granite XY stage, supported optics, reticle and laser.
 // Distant silhouette follows the detailed scanner's outside envelope.
 {
  const p=proxies.litho;
  box(p,'litho-floor-skid',5.1,.22,4.9,dark,0,.13,0);
  for(const x of [-2.1,2.1])for(const z of [-2,2]){
   box(p,'litho-floor-leg',.22,1.2,.22,steel,x,.72,z);
   box(p,'litho-foot',.4,.06,.4,dark,x,.03,z);
  }
  box(p,'litho-granite',3.4,.3,3.35,dark,0,1.12,0);
  box(p,'litho-stage',2.75,.09,2.8,pale,0,1.32,0);
  cylinder(p,'litho-wafer',.31,.31,.035,copper,0,1.55,0,16);
  for(const x of [-2.25,2.25])for(const z of [-2.1,2.1])
    box(p,'litho-upper-post',.15,3.65,.15,steel,x,1.93,z);
  for(const z of [-2.1,2.1])box(p,'litho-upper-beam',4.65,.15,.16,steel,0,3.72,z);
  box(p,'litho-top-bridge',.15,.15,4.3,steel,0,3.72,0);
  box(p,'litho-top-control',.35,.25,.42,dark,0,3.89,0);
  cylinder(p,'litho-optics',.3,.3,1.26,pale,0,2.16,0,14);
  cylinder(p,'litho-illuminator',.27,.27,.43,dark,0,3.39,0,14);
  box(p,'litho-reticle-rail',1.35,.12,.16,pale,0,3.25,-.34);
  box(p,'litho-reticle',.6,.04,.55,copper,0,3.02,0);
  box(p,'litho-laser',.85,.48,.75,dark,-1.44,1.82,0);
  box(p,'litho-laser-pedestal',.45,.54,.55,steel,-1.44,1.36,0);
  box(p,'litho-beam-duct',1.46,.12,.12,steel,-.73,3.35,0);
  p.userData.silhouette={source:'litho/scene.js',grounded:true,framePosts:4,
   carrierHeight:3.72,waferRadius:.31};
 }

 // Spin coater: bowl and central chuck, swinging dispense arm and adjacent hot plate.
 {
  const p=proxies.spin;
  cylinder(p,'spin-base',1.10,1.10,.84,dark,0,.42,0,20);
  cylinder(p,'spin-bowl',1.12,1.08,.68,steel,0,1.18,0,22);
  hoop(p,'spin-bowl-lip',1.1,.028,pale,0,1.52,0);
  cylinder(p,'spin-vacuum-chuck',.86,.86,.16,dark,0,1.18,0,20);
  cylinder(p,'spin-wafer',.78,.78,.02,pale,0,1.29,0,20);
  box(p,'spin-dispense-post',.11,1.83,.11,pale,-1.65,.93,0);
  box(p,'spin-dispense-arm',1.55,.07,.07,pale,-.875,1.85,0);
  cylinder(p,'spin-nozzle',.04,.04,.29,copper,-.1,1.65,0,10);
  box(p,'spin-hot-plate-base',.74,.17,.74,dark,1.85,.09,.55);
  cylinder(p,'spin-hot-plate',.30,.30,.035,pale,1.85,.19,.55,18);
  p.userData.silhouette={source:'spin/scene.js',waferRadius:.78,grounded:true};
 }
 // Ion implanter. Preserve the real instrument's recognizable source →
 // 90° mass-analysis magnet → extraction/scan beamline → end-station chain.
 // Only envelope and signature structural elements belong in overview LOD.
 {
  const p=proxies.implant;
  const y=1.2;
  const magnet=new THREE.MeshStandardMaterial({color:0x42536a,metalness:.78,roughness:.40});
  const coil=new THREE.MeshStandardMaterial({color:0xa96a39,metalness:.67,roughness:.48});
  const port=new THREE.MeshStandardMaterial({color:0x99aabb,metalness:.85,roughness:.32});
  // Stationary vacuum envelopes stay cheap and batch into the existing renderer.
  // Metadata comes from actual endpoints, so continuity can be verified in tests.
  const tube=(name,from,to,r,material)=>{
   const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to);
   const dir=b.clone().sub(a);
   const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),12),material);
   mesh.position.copy(a).add(b).multiplyScalar(.5);
   mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
   mesh.userData.centerline={from:a.toArray(),to:b.toArray()};
   mesh.name=name;p.add(mesh);return mesh;
  };
  const curvedTube=(name,path,r,material,segments=12)=>{
   const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,segments,r,7,false),material);
   mesh.name=name;p.add(mesh);return mesh;
  };
  // Common floor frame and functional supports; nothing floats in midair.
  box(p,'implant-deck',6.4,.14,2.20,steel,.50,.17,-.10);
  for(const x of [-2.3,-.95,.75,2.70])for(const z of [-.84,.84])
   box(p,'implant-frame-post',.12,.34,.12,dark,x,.17,z);
  box(p,'implant-source-deck',1.30,.12,1.34,dark,-1.32,.62,-2.53);
  for(const x of [-1.83,-.81])for(const z of [-2.96,-2.10])
   box(p,'implant-source-support',.09,.53,.09,steel,x,.32,z);
  box(p,'implant-source',.77,.63,.65,dark,-1.32,y,-2.53);
  // Schematic centerline: one exactly quarter-circular 90-degree analyzer.
  // Incoming tangent is +Z, outgoing tangent is +X. The source approach is
  // gently curved to mate tangentially to this magnet; no discontinuous pipes.
  const center=new THREE.Vector3(.50,y,-.60),radius=.60;
  const entry=new THREE.Vector3(center.x-radius,y,center.z);
  const exit=new THREE.Vector3(center.x,y,center.z+radius);
  const sourceOutlet=new THREE.Vector3(-1.04,y,-2.26);
  const approach=new THREE.CubicBezierCurve3(
   sourceOutlet,new THREE.Vector3(-.70,y,-1.96),
   new THREE.Vector3(entry.x,y,-1.35),entry
  );
  const analyzer=new THREE.Curve();
  analyzer.getPoint=(t,target=new THREE.Vector3())=>{
   const angle=Math.PI-t*Math.PI/2;
   return target.set(center.x+radius*Math.cos(angle),y,
    center.z+radius*Math.sin(angle));
  };
  const sourceFlange=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.09,12),port);
  sourceFlange.name='implant-extraction-flange';
  sourceFlange.position.copy(sourceOutlet);
  sourceFlange.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),
   approach.getTangent(0).normalize());
  p.add(sourceFlange);
  curvedTube('implant-incoming-beamline',approach,.15,pale,11);
  // Vacuum bend and pole faces share the SAME magnetic center/radius as
  // the beam trajectory. Annular pole faces match the detailed machine's
  // quadrant geometry more closely than the former offset quarter-tori.
  curvedTube('implant-analyzer-vacuum-bend',analyzer,.15,port,14);
  const poleGeom=new THREE.RingGeometry(.39,.83,18,1,Math.PI,Math.PI/2);
  poleGeom.rotateX(-Math.PI/2);
  for(const yy of [y-.25,y+.25]){
   const pole=new THREE.Mesh(poleGeom,magnet);
   pole.position.set(center.x,yy,center.z);
   pole.name='implant-analyzer-yoke';p.add(pole);
   const winding=new THREE.Curve();
   winding.getPoint=(t,target=new THREE.Vector3())=>{
    const angle=Math.PI-t*Math.PI/2;
    return target.set(center.x+.92*Math.cos(angle),
     yy+(yy>y?.06:-.06),center.z+.92*Math.sin(angle));
   };
   curvedTube('implant-analyzer-coil',winding,.065,coil,14);
  }
  tube('implant-analyzer-exit',exit.toArray(),[.95,y,0],.18,pale);
  tube('implant-accelerator',[.88,y,0],[1.63,y,0],.19,port);
  for(const x of [1.05,1.32,1.60])
   cylinder(p,'implant-accelerator-flange',.26,.26,.06,steel,x,y,0,14,'x');
  tube('implant-scanner-bellows',[1.65,y,0],[2.14,y,0],.23,dark);
  for(const x of [1.73,1.83,1.93,2.03])
   cylinder(p,'implant-bellows-rib',.27,.27,.04,pale,x,y,0,12,'x');
  // Horizontal cylindrical high-vacuum process chamber with end flange.
  cylinder(p,'implant-end-station',.77,.77,1.12,steel,2.65,y,0,20,'x');
  cylinder(p,'implant-end-flange',.87,.87,.08,port,3.22,y,0,20,'x');
  cylinder(p,'implant-chamber-viewport',.21,.21,.09,dark,2.65,y+.70,.28,16);
  cylinder(p,'implant-load-lock',.28,.28,.66,steel,2.72,y,.92,16,'z');
  cylinder(p,'implant-load-lock-flange',.34,.34,.07,port,2.72,y,1.28,14,'z');
  cylinder(p,'implant-turbo-neck',.25,.25,.18,dark,2.55,.48,0,14);
  cylinder(p,'implant-turbo-pump',.24,.18,.39,pale,2.55,.25,0,14);
  for(const z of [-.53,.53])
   box(p,'implant-chamber-support',.16,.47,.16,dark,2.65,.31,z);
  // Electronics cabinet remains separate from the vacuum train.
  box(p,'implant-control-rack',.92,1.65,.79,dark,4.18,.83,.35);
  box(p,'implant-rack-face',.04,1.37,.62,pale,4.67,.86,.35);
  for(const yy of [.50,.83,1.18])box(p,'implant-rack-module',.06,.13,.50,magnet,4.72,yy,.35);
  p.userData.silhouette={source:'implant/scene.js',analyzerAngle:90,grounded:true,
   sourceToAnalyzer:true,continuousBeamline:true,magnetYokes:2,loadLock:true,turboPump:true,
   bendRadius:radius,analyzerEntry:entry.toArray(),analyzerExit:exit.toArray()};
 }

 // The seven previews are fully static, so equivalent-material rigid meshes
 // can be submitted as far fewer GPU draws without losing any triangles.
 for(const [key,p] of Object.entries(proxies)){
  p.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  proxyStats[key]=batchProxies?mergeStaticDrawCalls(p):null;
 }

 return {
  room,proxies,proxyStats,outlines,slabs,layout,
  setFocus(active){
   for(const [key,p] of Object.entries(proxies))p.visible=key!==active;
  }
 };
}
