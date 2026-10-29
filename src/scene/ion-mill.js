import * as THREE from 'three';
import {BINS} from '../config/geometry.js';
export function buildIonMill({scene,MAT,cyl,box,annularTube,tubeAlong}) {
/* ============ ION MILL ============ */
const IMM = new THREE.Group();
IMM.position.set(16, 0, 0);
scene.add(IMM);

const CH_R = 1.8, CH_H = 3.4, CH_Y = 3.4;
const CH_BOTTOM = CH_Y - CH_H/2; // 1.70; support ring meets this flange.
const frameMaterial=MAT.steel3;

for (const x of [-2.2, 2.2]) {
  for (const z of [-2.2, 2.2]) {
    // Posts run continuously from the floor to the lower chamber collar.
    const leg = box(0.16, CH_BOTTOM - 0.06, 0.16, frameMaterial);
    leg.position.set(x, (CH_BOTTOM - 0.06)/2 + 0.06, z);
    IMM.add(leg);
    const foot = cyl(0.19, 0.22, 0.06, MAT.dark, 12);
    foot.position.set(x, 0.03, z);
    IMM.add(foot);
  }
}

// Steel skids and cross-braces make the assembly visibly floor-supported.
// A center pump pedestal catches the bottom of the turbo stack at y≈0.5.
for(const x of [-2.2,2.2]){
 const skid=box(.30,.18,4.9,MAT.dark);
 skid.position.set(x,.09,0);IMM.add(skid);
 const crossbar=box(.12,.12,4.4,frameMaterial);
 crossbar.position.set(x,1.05,0);IMM.add(crossbar);
}
for(const z of [-2.2,2.2]){
 const bottomTie=box(4.6,.12,.12,frameMaterial);
 bottomTie.position.set(0,.20,z);IMM.add(bottomTie);
 const upperTie=box(4.52,.11,.11,frameMaterial);
 upperTie.position.set(0,1.40,z);IMM.add(upperTie);
}
const collar=new THREE.Mesh(new THREE.TorusGeometry(CH_R+0.10,.09,8,40),MAT.steel2);
collar.rotation.x=Math.PI/2;collar.position.y=CH_BOTTOM-.015;IMM.add(collar);
for(const [x,z] of [[-2.2,-2.2],[-2.2,2.2],[2.2,-2.2],[2.2,2.2]]){
 const r=Math.hypot(x,z);
 const start=new THREE.Vector3(x*.78/r*2.45,CH_BOTTOM-.015,z*.78/r*2.45);
 const end=new THREE.Vector3(x,CH_BOTTOM-.015,z);
 const direction=end.clone().sub(start);
 const arm=box(direction.length(),.10,.10,frameMaterial);
 arm.position.copy(start).add(end).multiplyScalar(.5);
 arm.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),direction.normalize());
 IMM.add(arm);
}
const pumpPedestal=box(1.30,.56,1.36,MAT.dark);
pumpPedestal.position.set(0,.28,0);IMM.add(pumpPedestal);
for(const x of [-.53,.53]){
 const edge=box(.06,.50,1.4,MAT.steel2);
 edge.position.set(x,.30,0);IMM.add(edge);
}

const chamber = annularTube(CH_R - 0.08, CH_R, CH_H, MAT.alum, 36);
chamber.rotation.z = Math.PI / 2;
chamber.position.y = CH_Y;
IMM.add(chamber);

const topF = cyl(CH_R + 0.1, CH_R + 0.1, 0.08, MAT.steel2, 36);
topF.position.y = CH_Y + CH_H / 2;
IMM.add(topF);
const botF = cyl(CH_R + 0.1, CH_R + 0.1, 0.08, MAT.steel2, 36);
botF.position.y = CH_Y - CH_H / 2;
IMM.add(botF);

const SRC_Y = CH_Y + CH_H / 2 + 1.0;
const srcBody = cyl(0.75, 0.75, 0.60, MAT.steel2, 20);
srcBody.position.y = SRC_Y;
IMM.add(srcBody);
const srcTop = cyl(0.85, 0.85, 0.10, MAT.steel3, 20);
srcTop.position.y = SRC_Y + 0.35;
IMM.add(srcTop);

for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 5, 16), MAT.steel);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = SRC_Y - 0.32 - i * 0.03;
  IMM.add(ring);
}

IMM.add(tubeAlong([
  [0, SRC_Y + 0.40, 0], [0, SRC_Y + 1.2, 0],
  [0.6, SRC_Y + 1.6, 0.3], [1.5, SRC_Y + 1.7, 0.5],
], 0.06, MAT.rubber, 16));

const arB = cyl(0.25, 0.25, 1.2, MAT.steel2, 14);
arB.position.set(2.6, 2.2, 0.4);
IMM.add(arB);
const arCap = cyl(0.10, 0.10, 0.10, MAT.copper, 8);
arCap.position.set(2.6, 2.85, 0.4);
IMM.add(arCap);
IMM.add(tubeAlong([
  [0.7, SRC_Y, 0], [1.2, SRC_Y, 0], [1.6, SRC_Y - 0.2, 0],
  [2.1, SRC_Y - 0.9, 0.15], [2.4, 2.5, 0.3], [2.6, 2.8, 0.4],
], 0.05, MAT.steel3, 24));

const STG_Y = CH_Y - 0.3;
const stg = cyl(0.75, 0.75, 0.10, MAT.steel2, 20);
const tiltG = new THREE.Group(); tiltG.position.y = STG_Y; IMM.add(tiltG);
stg.position.y = 0; tiltG.add(stg);
const shaft = cyl(0.10, 0.10, 1.5, MAT.steel3, 10);
shaft.position.y = STG_Y - 0.75;
IMM.add(shaft);
const motor = cyl(0.30, 0.30, 0.35, MAT.dark, 12);
motor.position.y = CH_Y - CH_H / 2 - 0.4;
IMM.add(motor);

const vpBody = cyl(0.35, 0.35, 0.30, MAT.steel2, 14);
vpBody.rotation.x = Math.PI / 2;
vpBody.position.set(0, CH_Y + 0.3, CH_R + 0.15);
IMM.add(vpBody);
const vpGlass = cyl(0.28, 0.28, 0.02, MAT.glass, 14);
vpGlass.rotation.x = Math.PI / 2;
vpGlass.position.set(0, CH_Y + 0.3, CH_R + 0.31);
IMM.add(vpGlass);

/* viewport glow — visible plasma through the window */
const vpGlow = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20), MAT.vpGlow);
vpGlow.position.set(0, CH_Y + 0.3, CH_R + 0.32);
IMM.add(vpGlow);

// Load lock is supported by a bracket beneath its outer cylinder; the
// displayed transfer happens offscreen and the process wafer starts clamped.
const loadLockPost=box(.14,1.55,.14,frameMaterial);
loadLockPost.position.set(CH_R+.64,2.24,0);IMM.add(loadLockPost);
const lockBrace=box(1.20,.10,.12,frameMaterial);
lockBrace.position.set(CH_R+.16,1.65,0);IMM.add(lockBrace);
const lockGate=box(.20,.86,.86,MAT.steel3);
lockGate.position.set(CH_R+.12,CH_Y,0);IMM.add(lockGate);
const lock = cyl(0.40, 0.40, 0.60, MAT.steel2, 14);
lock.rotation.z = Math.PI / 2;
lock.position.set(CH_R + 0.4, CH_Y, 0);
IMM.add(lock);
for(const x of [CH_R+.12,CH_R+.72]){
 const flange=cyl(.48,.48,.075,MAT.flange??MAT.steel2,18);
 flange.rotation.z=Math.PI/2;flange.position.set(x,CH_Y,0);IMM.add(flange);
}
const lkv = cyl(0.12, 0.12, 0.15, MAT.copper, 8);
lkv.position.set(CH_R + 0.8, CH_Y, 0);
IMM.add(lkv);

const turbo = cyl(0.45, 0.45, 0.50, MAT.steel2, 16);
turbo.position.y = CH_Y - CH_H / 2 - 0.7;
IMM.add(turbo);
for (let i = 0; i < 4; i++) {
  const f = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.02, 4, 14), MAT.steel3);
  f.rotation.x = Math.PI / 2;
  f.position.y = CH_Y - CH_H / 2 - 0.5 - i * 0.1;
  IMM.add(f);
}
const turboB = cyl(0.35, 0.30, 0.25, MAT.dark, 12);
turboB.position.y = CH_Y - CH_H / 2 - 1.10;
IMM.add(turboB);

/* wafer — rotates with stage */
const wafer = new THREE.Group();
// The chip is preloaded and mechanically seated on the cooled stage;
// do not animate it outside the chamber as an unsupported floating body.
wafer.position.set(0,.06,0);
wafer.userData.mountedOnStage = true;
tiltG.add(wafer);

const wSub = box(1.0, 0.08, 0.8, MAT.substrate);
wafer.add(wSub);

const immLayers = [];
let immCum = 0.04;
const IMIN = 0.04, IFAC = 0.10, RW = 0.18, FW = (0.9 - RW) / 2, FX = RW / 2 + FW / 2;
const etchL = [];      /* flanks: [left,right] meshes per layer */
BINS.forEach((b, i) => {
  if (b.thickness === null) { immLayers[i] = null; etchL[i] = null; return; }
  const h = IMIN + b.thickness * IFAC;
  const mk = () => new THREE.MeshStandardMaterial({ color: b.color, metalness: 0.8, roughness: 0.2, emissive: b.color, emissiveIntensity: 0.10 });
  const y = 0.04 + immCum + h / 2;
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(RW, h, 0.7), mk()); ridge.position.set(0, y, 0); wafer.add(ridge);
  const fl = [-FX, FX].map(x => { const m = new THREE.Mesh(new THREE.BoxGeometry(FW, h, 0.7), mk()); m.position.set(x, y, 0); wafer.add(m); return m; });
  immLayers[i] = { mesh: ridge, baseY: 0.04 + immCum, h };
  etchL[i] = { meshes: fl, baseY: 0.04 + immCum, h, t: b.thickness };
  immCum += h;
});

/* ridge mask: ONE resist stripe over the ridge; both flanks are exposed and etched */
const MASK_TOP = 0.04 + immCum, RES_H = 0.27;   /* 1.5 µm at the layer stack's ~0.18 u/µm, so resist loss reads on the same scale as the etch */
const resist = box(RW, RES_H, 0.7, MAT.resist);
resist.position.set(0, MASK_TOP + RES_H / 2, 0);
wafer.add(resist);

/* wafer clamp clips (hold the chip on the cooled stage) */
for (const [cx, cz] of [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]]) {
  const clip = box(0.10, 0.03, 0.10, MAT.steel3); clip.position.set(cx, 0.015, cz); wafer.add(clip);
}

/* ---- source mounting neck, neutraliser, two-leaf shutter, backing pump, gauge, tilt axle ---- */
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.66, 24, 1, true), MAT.glass);
neck.position.y = CH_Y + CH_H / 2 + 0.47; IMM.add(neck);
const neutMat = new THREE.MeshStandardMaterial({ color: 0x331a08, emissive: 0xff7a20, emissiveIntensity: 0 });
const neut = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 16), neutMat);
neut.rotation.x = Math.PI / 2; neut.position.set(0.68, CH_Y + CH_H / 2 - 0.38, 0); IMM.add(neut);
const shutterY = STG_Y + 1.05;
const shutterMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b4, metalness: 0.9, roughness: 0.35, emissive: 0xff6a20, emissiveIntensity: 0 });
const mkLeaf = (sg) => { const g = new THREE.Group(); g.position.set(sg * 0.78, shutterY, 0);
  const b = box(0.78, 0.03, 1.6, shutterMat); b.position.x = -sg * 0.39; g.add(b); IMM.add(g); return g; };
const leafL = mkLeaf(-1), leafR = mkLeaf(1);
const bp = box(1.1, 0.5, 0.6, MAT.dark); bp.position.set(-3.0, 0.25, 0); IMM.add(bp);
IMM.add(tubeAlong([[0, 0.45, 0], [0, 0.40, 0], [-1.5, 0.40, 0], [-2.4, 0.40, 0]], 0.07, MAT.steel3, 16));
const ionGauge = cyl(0.13, 0.13, 0.5, MAT.steel2, 14); ionGauge.rotation.z = Math.PI / 2;
ionGauge.position.set(-(CH_R + 0.25), CH_Y - 0.9, 0); IMM.add(ionGauge);
const tAxle = cyl(0.05, 0.05, 2.0, MAT.steel3, 10); tAxle.rotation.z = Math.PI / 2; tAxle.position.set(0, STG_Y - 0.09, 0); IMM.add(tAxle);
for (const x of [-1.0, 1.0]) { const tr = box(0.12, 0.3, 0.2, MAT.steel3); tr.position.set(x, STG_Y - 0.2, 0); IMM.add(tr); }

/* beam + plasma */
const BT = SRC_Y - 0.4;
const BB = STG_Y + 0.80;
const beamCone = new THREE.Mesh(
  new THREE.CylinderGeometry(0.55, 0.68, BT - BB, 20, 1, true), MAT.beam);
beamCone.position.y = (BT + BB) / 2;

IMM.add(beamCone);

const plasma = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), MAT.plasma);
plasma.position.y = SRC_Y - 0.35;
IMM.add(plasma);

const plasmaCore = new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 8), MAT.plasmaCore);
plasmaCore.position.y = SRC_Y - 0.35;
IMM.add(plasmaCore);

/* sputter particles as directional streaks */
const sputters = [];
for (let i = 0; i < 24; i++) {
  const geo = new THREE.CylinderGeometry(0.002, 0.010, 0.10, 3);
  const p = new THREE.Mesh(geo, MAT.sput.clone());
  p.visible = false;
  IMM.add(p);
  sputters.push({ mesh: p, age: 1.0, vx: 0, vy: 0, vz: 0 });
}

// Mechanical supports are static: existing lossless batching can combine
// compatible same-material meshes without removing any visible detail.
IMM.userData.ionMillAssembly = {
 supportedAtFloor:true, chamberBottomY:CH_BOTTOM, supportTopY:CH_BOTTOM,
 preloadedWafer:true, loadLockBracket:true, pumpPedestal:true
};

const chamberLight = new THREE.PointLight(0x6fb8ff, 0, 6, 2);
chamberLight.position.set(0, CH_Y, 0);
IMM.add(chamberLight);


return {IMM,etchL,wafer,resist,MASK_TOP,RES_H,tiltG,beamCone,plasma,plasmaCore,sputters,chamberLight,neutMat,leafL,leafR,shutterMat,shutterY,BT,BB,stg,RW,FW,vpGlow};
}
