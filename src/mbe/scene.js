import * as THREE from 'three';
import {LAYER_INFO} from './process.js';
import {mergeStaticDrawCalls} from '../scene/merge-static.js';

// A station inside Foundry's shared room: no second WebGL renderer or camera.
export function buildMbe({scene, clipPlane}) {
const MBE = new THREE.Group();
MBE.name = 'MBE · Molecular Beam Epitaxy';
MBE.position.set(30,0,0);
scene.add(MBE);
const CLIP = {clippingPlanes:[clipPlane], clipShadows:false};

// Room environment and primary lighting are shared with the other stations.
const heaterLight = new THREE.PointLight(0xff4a10,0,3.5,2);
heaterLight.position.set(0,4.55,0);
MBE.add(heaterLight);

const MAT = {
  chamber:  new THREE.MeshStandardMaterial({ color:0xb0bcc8, metalness:.92, roughness:.30, envMapIntensity:1.5, side:THREE.DoubleSide, ...CLIP }),
  cone:     new THREE.MeshStandardMaterial({ color:0xa8b4c0, metalness:.92, roughness:.32, envMapIntensity:1.4, side:THREE.DoubleSide, ...CLIP }),
  cryo:     new THREE.MeshStandardMaterial({ color:0x1a2530, metalness:.75, roughness:.55, side:THREE.DoubleSide, ...CLIP }),
  flange:   new THREE.MeshStandardMaterial({ color:0xa0a8b2, metalness:.92, roughness:.32, envMapIntensity:1.5, ...CLIP }),
  steel:    new THREE.MeshStandardMaterial({ color:0xc3ccd5, metalness:1.0, roughness:.24, envMapIntensity:1.5 }),
  steel2:   new THREE.MeshStandardMaterial({ color:0x939da8, metalness:1.0, roughness:.38, envMapIntensity:1.3 }),
  steel3:   new THREE.MeshStandardMaterial({ color:0x5b636d, metalness:1.0, roughness:.52, envMapIntensity:1.1 }),
  dark:     new THREE.MeshStandardMaterial({ color:0x14161a, metalness:.55, roughness:.62 }),
  copper:   new THREE.MeshStandardMaterial({ color:0xb87333, metalness:1.0, roughness:.30 }),
  glass:    new THREE.MeshPhysicalMaterial({ color:0xdff4ff, metalness:0, roughness:.03,
               transparent:true, opacity:.15, depthWrite:false, envMapIntensity:2.5, side:THREE.DoubleSide }),
  waBase:   new THREE.MeshStandardMaterial({ color:0x3a4a5a, metalness:.55, roughness:.35, emissive:0x000000, emissiveIntensity:0 }),
  moly:     new THREE.MeshStandardMaterial({ color:0x2a2018, metalness:.7, roughness:.5, emissive:0xff3a10, emissiveIntensity:0 }),
  pbn:      new THREE.MeshStandardMaterial({ color:0x1a1a1a, metalness:.15, roughness:.85, ...CLIP }),
  taCoil:   new THREE.MeshStandardMaterial({ color:0x2a1a08, metalness:.7, roughness:.4, emissive:0xff5a20, emissiveIntensity:0, ...CLIP }),
  waterJack: new THREE.MeshStandardMaterial({ color:0x8a949e, metalness:.9, roughness:.35, ...CLIP }),
  shutter:  new THREE.MeshStandardMaterial({ color:0x9aa7b4, metalness:.9, roughness:.35 }),
  rheedGun: new THREE.MeshStandardMaterial({ color:0x707880, metalness:.9, roughness:.42, ...CLIP }),
  rheedScr: new THREE.MeshStandardMaterial({ color:0x0a2a20, emissive:0x2bff96, emissiveIntensity:0, roughness:.5 }),
  gauge:    new THREE.MeshStandardMaterial({ color:0x0a1a28, emissive:0x4dc8ff, emissiveIntensity:0, roughness:.4 }),
  ionPump:  new THREE.MeshStandardMaterial({ color:0x606870, metalness:.85, roughness:.45, ...CLIP }),
  rga:      new THREE.MeshStandardMaterial({ color:0x505860, metalness:.85, roughness:.5, ...CLIP }),
  bfmBody:  new THREE.MeshStandardMaterial({ color:0x808890, metalness:.9, roughness:.4, ...CLIP }),
  bfmFace:  new THREE.MeshStandardMaterial({ color:0x0a1a28, emissive:0x4dc8ff, emissiveIntensity:0, roughness:.4 }),
  beamR:    new THREE.MeshBasicMaterial({ color:0x8fffc8, transparent:true, opacity:0, depthWrite:false }),
  beamI:    new THREE.MeshBasicMaterial({ color:0x88ddff, transparent:true, opacity:0, depthWrite:false }),
  ledG:     new THREE.MeshStandardMaterial({ color:0x001a05, emissive:0x36ff78, emissiveIntensity:3.5 }),
};

const cyl = (rt,rb,h,m,s=32,o=false) => new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s,1,o),m);
const box = (w,h,d,m) => new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);

function ring(rIn,rOut,len,m,s=32){
  const sh = new THREE.Shape();
  sh.absarc(0,0,rOut,0,Math.PI*2,false);
  const hole = new THREE.Path();
  hole.absarc(0,0,rIn,0,Math.PI*2,true);
  sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh,{depth:len,bevelEnabled:false,curveSegments:s});
  g.translate(0,0,-len/2); g.rotateY(Math.PI/2);
  return new THREE.Mesh(g,m);
}

function helix(radius, height, turns, tubeR, mat) {
  const pts = [];
  const N = Math.round(turns * 20);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a)*radius, t*height, Math.sin(a)*radius));
  }
  const c = new THREE.CatmullRomCurve3(pts);
  return new THREE.Mesh(new THREE.TubeGeometry(c, N*2, tubeR, 5, false), mat);
}

function boltRing(radius, count, material) {
  const bolts = new THREE.InstancedMesh(new THREE.CylinderGeometry(.022,.022,.05,6),material,count);
  const pose = new THREE.Object3D();
  for(let i=0;i<count;i++){
    const angle=i/count*Math.PI*2;
    pose.position.set(Math.cos(angle)*radius,0,Math.sin(angle)*radius);
    pose.updateMatrix();
    bolts.setMatrixAt(i,pose.matrix);
  }
  bolts.instanceMatrix.needsUpdate=true;
  return bolts;
}

function tubeAlong(pts, r, m, seg=20, rad=6){
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, rad, false), m);
}

const CH_R = 1.5, CH_BOT = 2.0, CH_MID = 5.3, CH_TOP = 5.9, SUB_Y = 4.7;

[[-2.0,-1.9],[-2.0,1.9],[2.0,-1.9],[2.0,1.9]].forEach(([x,z]) => {
  const leg = box(0.14, 1.92, 0.14, MAT.steel3);
  leg.position.set(x, 0.96, z); leg.castShadow = true; MBE.add(leg);
  const foot = cyl(0.19, 0.22, 0.06, MAT.dark, 12);
  foot.position.set(x, 0.03, z); MBE.add(foot);
});
for (const z of [-1.9, 1.9]) {
  const rail = box(4.14, 0.10, 0.10, MAT.steel3);
  rail.position.set(0, 1.45, z); MBE.add(rail);
}

// V2 support frame: horizontal ties, a circular support collar and radial
// brackets physically connect the feet and the UHV chamber rather than
// leaving the vessel apparently unsupported.
for (const x of [-2.0,2.0]){
 const rail=box(.10,.10,3.8,MAT.steel3);
 rail.position.set(x,1.45,0);MBE.add(rail);
}
const supportCollar=ring(1.55,1.72,.09,MAT.steel2,40);
supportCollar.rotation.z=Math.PI/2;
supportCollar.position.y=1.92;
MBE.add(supportCollar);
for(const [x,z] of [[-2,-1.9],[-2,1.9],[2,-1.9],[2,1.9]]){
 const length=Math.hypot(x,z),start=new THREE.Vector3(x*1.72/length,1.92,z*1.72/length);
 const end=new THREE.Vector3(x,1.92,z),delta=end.clone().sub(start);
 const arm=box(delta.length(),.09,.09,MAT.steel3);
 arm.position.copy(start).add(end).multiplyScalar(.5);
 arm.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),delta.normalize());
 MBE.add(arm);
}

const body = ring(CH_R - 0.08, CH_R, CH_MID - CH_BOT, MAT.chamber, 40);
body.rotation.z = Math.PI/2;
body.position.y = (CH_BOT + CH_MID) / 2;
body.castShadow = true; body.receiveShadow = true; MBE.add(body);

const cone = cyl(0.75, CH_R, CH_TOP - CH_MID, MAT.cone, 40, true);
cone.position.y = (CH_MID + CH_TOP) / 2;
cone.castShadow = true; cone.receiveShadow = true; MBE.add(cone);

const cryo = ring(CH_R - 0.22, CH_R - 0.10, CH_MID - CH_BOT - 0.30, MAT.cryo, 32);
cryo.rotation.z = Math.PI/2;
cryo.position.y = (CH_BOT + CH_MID) / 2;
cryo.castShadow = true; cryo.receiveShadow = true; MBE.add(cryo);

const botF = cyl(CH_R + 0.15, CH_R + 0.15, 0.10, MAT.flange, 40);
botF.position.y = CH_BOT; botF.castShadow = true; botF.receiveShadow = true; MBE.add(botF);
const botB = boltRing(CH_R + 0.06, 28, MAT.steel3); botB.position.y = CH_BOT - 0.07; MBE.add(botB);

const topF = cyl(0.85, 0.85, 0.12, MAT.flange, 32);
topF.position.y = CH_TOP + 0.02; topF.castShadow = true; topF.receiveShadow = true; MBE.add(topF);
const topB = boltRing(0.72, 20, MAT.steel3); topB.position.y = CH_TOP + 0.09; MBE.add(topB);

for (let i = 0; i < 8; i++) {
  if (i === 2 || i === 6) continue;
  const a = (i / 8) * Math.PI * 2 + Math.PI/8;
  const port = cyl(0.14, 0.14, 0.22, MAT.flange, 12);
  port.rotation.z = Math.PI/2;
  port.rotation.y = -a;
  port.position.set(Math.cos(a)*(CH_R+0.14), CH_MID-0.6, Math.sin(a)*(CH_R+0.14));
  port.castShadow = true; MBE.add(port);
}

for (let i = 0; i < 8; i++) {
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.055, 6, 16), MAT.steel3);
  t.rotation.x = Math.PI/2;
  t.position.y = CH_TOP + 0.20 + i * 0.08;
  t.castShadow = true; MBE.add(t);
}
const motorBase = cyl(0.30, 0.30, 0.12, MAT.flange, 20);
motorBase.position.y = CH_TOP + 0.90; motorBase.castShadow = true; MBE.add(motorBase);
const motor = cyl(0.34, 0.34, 0.40, MAT.dark, 20);
motor.position.y = CH_TOP + 1.15; motor.castShadow = true; MBE.add(motor);
const motorCap = cyl(0.26, 0.34, 0.10, MAT.steel2, 20);
motorCap.position.y = CH_TOP + 1.42; motorCap.castShadow = true; MBE.add(motorCap);

const shaftIn = cyl(0.09, 0.09, CH_TOP - SUB_Y - 0.15, MAT.steel2, 12);
shaftIn.position.y = (CH_TOP + SUB_Y) / 2 + 0.03;
shaftIn.castShadow = true; MBE.add(shaftIn);

const holder = cyl(0.55, 0.55, 0.10, MAT.steel2, 24);
holder.position.y = SUB_Y + 0.06; holder.castShadow = true; holder.receiveShadow = true; MBE.add(holder);

const heater = cyl(0.50, 0.50, 0.06, MAT.moly, 24);
heater.position.y = SUB_Y + 0.13; MBE.add(heater);

const waferGroup = new THREE.Group();
waferGroup.position.y = SUB_Y;
MBE.add(waferGroup);

// The UI specifies a 2-inch wafer, so represent the substrate and film as circular discs.
const wafer = cyl(0.275, 0.275, 0.02, MAT.waBase, 40);
wafer.position.y = -0.01;
wafer.castShadow = true; wafer.receiveShadow = true;
waferGroup.add(wafer);

const LAYER_VIS_SCALE = 0.12;
const growthLayers = [];
let cumH = 0;
LAYER_INFO.forEach((info, i) => {
  const h = 0.020 + info.thick * LAYER_VIS_SCALE;
  const m = new THREE.MeshStandardMaterial({ color: info.color, metalness:.7, roughness:.28, emissive: info.color, emissiveIntensity:.15 });
  const mesh = cyl(0.26, 0.26, 1, m, 40);
  mesh.scale.y = 0.001;
  mesh.position.y = -0.02 - cumH;
  mesh.visible = false;
  mesh.castShadow = true; mesh.receiveShadow = true;
  waferGroup.add(mesh);
  growthLayers.push({ mesh, height: h, baseY: -0.02 - cumH, info });
  cumH += h;
});


const CELL_DATA = [
  { name:'Ga', angle: 0,              beamColor: 0xffcc88 },
  { name:'Al', angle: Math.PI*2/3,    beamColor: 0xddeeff },
  { name:'As', angle: Math.PI*4/3,    beamColor: 0xddaaff },
];
const cells = [];
const cellBeams = [];
const SUB_TARGET = new THREE.Vector3(0, SUB_Y - 0.02, 0);

CELL_DATA.forEach(cd => {
  const baseX = Math.sin(cd.angle) * 0.65;
  const baseZ = Math.cos(cd.angle) * 0.65;
  const basePos = new THREE.Vector3(baseX, CH_BOT + 0.05, baseZ);
  const tipPos = new THREE.Vector3(baseX * 0.35, CH_BOT + 1.0, baseZ * 0.35);

  const dir = tipPos.clone().sub(basePos);
  const len = dir.length();

  const g = new THREE.Group();
  g.position.copy(basePos);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
  MBE.add(g);

  const jacket = cyl(0.13, 0.13, len * 0.85, MAT.waterJack, 16);
  jacket.position.y = len * 0.42;
  jacket.castShadow = true; jacket.receiveShadow = true;
  g.add(jacket);

  const wf1 = cyl(0.025, 0.025, 0.10, MAT.copper, 8);
  wf1.rotation.z = Math.PI/2; wf1.position.set(0.16, len * 0.25, 0); g.add(wf1);
  const wf2 = cyl(0.025, 0.025, 0.10, MAT.copper, 8);
  wf2.rotation.z = Math.PI/2; wf2.position.set(0.16, len * 0.55, 0); g.add(wf2);

  const crucible = cyl(0.085, 0.085, len * 0.95, MAT.pbn, 14);
  crucible.position.y = len * 0.47;
  g.add(crucible);

  const coilMat = MAT.taCoil.clone();
  coilMat.clippingPlanes = [clipPlane];
  const heaterCoil = helix(0.10, len * 0.65, 6, 0.012, coilMat);
  heaterCoil.position.y = len * 0.15;
  g.add(heaterCoil);

  const tip = cyl(0.045, 0.085, 0.10, MAT.steel2, 14);
  tip.position.y = len * 0.95;
  g.add(tip);

  // V2 shutter assembly: visible rotary shaft, vacuum feedthrough, radial
  // actuator arm and circular blade, each on the original animated hinge.
  const shutterOffset=.22, shaftBottom=.10, shaftTop=len*.98;
  const shutterShaft=cyl(.016,.016,shaftTop-shaftBottom,MAT.steel3,8);
  shutterShaft.position.set(shutterOffset,(shaftBottom+shaftTop)/2,0);
  g.add(shutterShaft);
  const feedthrough=cyl(.045,.045,.06,MAT.copper,10);
  feedthrough.position.set(shutterOffset,shaftBottom,0);
  g.add(feedthrough);

  const hinge=new THREE.Group();
  hinge.position.set(shutterOffset,shaftTop,0);
  g.add(hinge);
  const bracket=box(shutterOffset+.02,.018,.05,MAT.steel2);
  bracket.position.set(-shutterOffset/2,0,0);
  hinge.add(bracket);
  const blade=cyl(.15,.15,.012,MAT.shutter,20);
  blade.position.set(-shutterOffset,0,0);
  hinge.add(blade);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.015,6,4),MAT.ledG.clone());
  dot.position.set(-shutterOffset,.01,0);
  hinge.add(dot);

  cells.push({
    name: cd.name, group: g, hinge, coil: heaterCoil, dot,
    kKey: cd.name.toLowerCase(), beamColor: cd.beamColor
  });

  const tipWorld = basePos.clone().add(dir.clone().normalize().multiplyScalar(len * 0.98));
  const beamVec = SUB_TARGET.clone().sub(tipWorld);
  const beamLen = beamVec.length();
  const beamGeo = new THREE.CylinderGeometry(0.075, 0.025, beamLen, 8, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: cd.beamColor, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.copy(tipWorld).add(SUB_TARGET).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), beamVec.clone().normalize());
  MBE.add(beam);
  cellBeams.push(beam);
});

const RHEED_GUN = new THREE.Vector3(1.6, SUB_Y - 0.15, 0);
const RHEED_SCR = new THREE.Vector3(-1.6, SUB_Y - 0.15, 0);

const gun = cyl(0.16, 0.22, 0.55, MAT.rheedGun, 16);
gun.rotation.z = Math.PI/2; gun.position.copy(RHEED_GUN);
gun.castShadow = true; gun.receiveShadow = true; MBE.add(gun);

const gunTip = cyl(0.05, 0.10, 0.10, MAT.steel2, 12);
gunTip.rotation.z = Math.PI/2;
gunTip.position.set(RHEED_GUN.x - 0.32, RHEED_GUN.y, RHEED_GUN.z);
MBE.add(gunTip);

const screenFrame = box(0.55, 0.45, 0.05, MAT.steel3);
screenFrame.position.copy(RHEED_SCR);
screenFrame.rotation.y = Math.PI/2;
screenFrame.castShadow = true; screenFrame.receiveShadow = true; MBE.add(screenFrame);

const screenFace = box(0.48, 0.38, 0.008, MAT.rheedScr);
screenFace.position.set(RHEED_SCR.x + 0.03, RHEED_SCR.y, RHEED_SCR.z);
screenFace.rotation.y = Math.PI/2;
MBE.add(screenFace);

const beamInMat = MAT.beamI.clone();
const beamIn = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.6, 6, 1, true), beamInMat);
{
  const a = new THREE.Vector3(RHEED_GUN.x - 0.32, RHEED_GUN.y, 0);
  const b = new THREE.Vector3(0, SUB_Y - 0.02, 0);
  beamIn.position.copy(a).add(b).multiplyScalar(0.5);
  beamIn.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), b.clone().sub(a).normalize());
  MBE.add(beamIn);
}

const beamOutMat = MAT.beamR.clone();
const beamOut = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1.6, 6, 1, true), beamOutMat);
{
  const a = new THREE.Vector3(0, SUB_Y - 0.02, 0);
  const b = new THREE.Vector3(RHEED_SCR.x + 0.03, RHEED_SCR.y, 0);
  beamOut.position.copy(a).add(b).multiplyScalar(0.5);
  beamOut.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), b.clone().sub(a).normalize());
  MBE.add(beamOut);
}

const bfmPivot = new THREE.Group();
bfmPivot.position.set(0.70, SUB_Y - 0.45, 0);
MBE.add(bfmPivot);
const bfmBody = cyl(0.14, 0.14, 0.18, MAT.bfmBody, 14);
bfmBody.position.x = 0.70;
bfmPivot.add(bfmBody);
const bfmFace = cyl(0.11, 0.11, 0.015, MAT.bfmFace, 14);
bfmFace.position.set(0.70, 0.10, 0);
bfmPivot.add(bfmFace);

const ionPumpBody = cyl(0.42, 0.42, 0.65, MAT.ionPump, 20);
ionPumpBody.rotation.z = Math.PI/2;
ionPumpBody.position.set(-(CH_R + 0.55), CH_MID - 1.2, 0);
ionPumpBody.castShadow = true; ionPumpBody.receiveShadow = true; MBE.add(ionPumpBody);
for (let i = 0; i < 5; i++) {
  const fin = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.022, 5, 18), MAT.steel3);
  fin.rotation.y = Math.PI/2;
  fin.position.set(-(CH_R + 0.32) - i * 0.12, CH_MID - 1.2, 0);
  MBE.add(fin);
}
MBE.add(tubeAlong([ [-(CH_R + 0.02), CH_MID-1.2, 0], [-(CH_R + 0.25), CH_MID-1.2, 0] ], 0.10, MAT.steel2, 12));

const rgaBody = cyl(0.10, 0.10, 0.55, MAT.rga, 12);
rgaBody.rotation.x = Math.PI/2;
rgaBody.position.set(0, CH_MID - 1.0, -(CH_R + 0.30));
MBE.add(rgaBody);

const vpBody = cyl(0.36, 0.36, 0.32, MAT.steel2, 20);
vpBody.rotation.x = Math.PI/2;
vpBody.position.set(0, CH_MID - 1.0, CH_R + 0.16);
vpBody.castShadow = true; MBE.add(vpBody);
const vpGlass = cyl(0.28, 0.28, 0.02, MAT.glass, 20);
vpGlass.rotation.x = Math.PI/2;
vpGlass.position.set(0, CH_MID - 1.0, CH_R + 0.33);
MBE.add(vpGlass);

const lock = cyl(0.38, 0.38, 0.65, MAT.steel2, 16);
lock.rotation.x = Math.PI/2;
lock.position.set(0, CH_MID - 1.0, -(CH_R + 0.42));
lock.castShadow = true; lock.receiveShadow = true; MBE.add(lock);
const lockEnd = cyl(0.46, 0.46, 0.08, MAT.flange, 16);
lockEnd.rotation.x = Math.PI/2;
lockEnd.position.set(0, CH_MID - 1.0, -(CH_R + 0.78));
lockEnd.castShadow = true; MBE.add(lockEnd);

const turbo = cyl(0.30, 0.30, 0.55, MAT.steel2, 16);
turbo.position.set(-0.9, CH_BOT - 0.35, 0);
turbo.castShadow = true; turbo.receiveShadow = true; MBE.add(turbo);

const gauge = cyl(0.10, 0.10, 0.28, MAT.steel2, 10);
gauge.rotation.z = Math.PI/2;
gauge.position.set(-(CH_R + 0.20), CH_MID - 0.55, 0);
MBE.add(gauge);
const gaugeTip = cyl(0.08, 0.08, 0.03, MAT.gauge, 10);
gaugeTip.rotation.z = Math.PI/2;
gaugeTip.position.set(-(CH_R + 0.36), CH_MID - 0.55, 0);
MBE.add(gaugeTip);


// Expensive per-triangle shadow passes were a major performance cost.
MBE.traverse(object => {
 if(object.isMesh){object.castShadow=false;object.receiveShadow=false;}
});
// Combine only rigid meshes with exactly identical material and vertex
// signatures; preserve every source vertex, normal, UV, clipping plane, and
// the independently animated wafer/beam/effusion shutter objects.
const renderOptimization=mergeStaticDrawCalls(MBE,{
  exclude:new Set([body,cone,holder,heater,beamIn,beamOut])
});
body.castShadow=true;
cone.castShadow=true;
holder.castShadow=true;
return {MBE,clipPlane,MAT,CH_TOP,renderOptimization,
  cells,cellBeams,growthLayers,waferGroup,holder,heaterLight,
  beamIn,beamOut,bfmPivot,RHEED_MAX:220};
}
