import * as THREE from 'three';
import {mergeStaticDrawCalls} from '../scene/merge-static.js';
import {LITHO_FIELD_ORDER} from './process.js';
export const LITHO_X=62;
/**
 * Fidelity-preserving port of the supplied 193-nm scanner geometry.
 * Original arrangement, dimensions, optical materials, beam ducts and
 * projection barrel are retained; only room-wide renderer/lights/floor
 * and per-frame loop are removed.
 */
export function buildLitho({scene,camera,batchStatic=true}){
 const group=new THREE.Group();
 group.name='ArF immersion scanner · original geometry';
 group.position.x=LITHO_X;scene.add(group);
/* ============ MATERIALS ============ */
const MAT = {
  frame:    new THREE.MeshStandardMaterial({ color:0x2a2e38, metalness:0.85, roughness:0.5 }),
  frame2:   new THREE.MeshStandardMaterial({ color:0x1a1e26, metalness:0.7, roughness:0.55 }),
  frame3:   new THREE.MeshStandardMaterial({ color:0x22262e, metalness:0.8, roughness:0.55 }),
  granite:  new THREE.MeshStandardMaterial({ color:0x1e2028, metalness:0.3, roughness:0.85 }),
  stageTop: new THREE.MeshStandardMaterial({ color:0xa8b0bc, metalness:0.9, roughness:0.3 }),
  stageMid: new THREE.MeshStandardMaterial({ color:0x8a929c, metalness:0.9, roughness:0.4 }),
  chuck:    new THREE.MeshStandardMaterial({ color:0x3a4048, metalness:0.6, roughness:0.5 }),
  wafer:    new THREE.MeshStandardMaterial({ color:0x4a5a72, metalness:0.85, roughness:0.15, envMapIntensity:1.4 }),
  lensGlass:new THREE.MeshPhysicalMaterial({
    color:0xb8c8e0, metalness:0, roughness:0.05,
    transparent:true, opacity:0.30, clearcoat:1,
    depthWrite:false, side:THREE.DoubleSide
  }),
  lensRing: new THREE.MeshStandardMaterial({ color:0x1a1d24, metalness:0.9, roughness:0.4 }),
  lensBarrel: new THREE.MeshStandardMaterial({
    color:0x14161c, metalness:0.85, roughness:0.5,
    transparent:true, opacity:0.30, depthWrite:false
  }),
  water:    new THREE.MeshPhysicalMaterial({
    color:0x9ad0e8, metalness:0, roughness:0.03,
    transparent:true, opacity:0.42, clearcoat:1, clearcoatRoughness:0.02,
    depthWrite:false, side:THREE.DoubleSide
  }),
  reticleGlass: new THREE.MeshPhysicalMaterial({
    color:0xdce0ff, metalness:0, roughness:0.1,
    transparent:true, opacity:0.28, clearcoat:1, depthWrite:false,
    side:THREE.DoubleSide
  }),
  reticleFrame: new THREE.MeshStandardMaterial({ color:0x1a1c22, metalness:0.85, roughness:0.4 }),
  mirror:   new THREE.MeshStandardMaterial({ color:0xe8eef8, metalness:1.0, roughness:0.05, envMapIntensity:1.5 }),
  laserBox: new THREE.MeshStandardMaterial({ color:0x14161c, metalness:0.7, roughness:0.55 }),
  /* ◆ BDU duct is now semi-transparent so the beam inside is visible.
   *   Physically a real BDU is opaque metal, but for teaching we let the
   *   beam path be seen — and it also eliminates the "dead" beam meshes. */
  bduDuct:  new THREE.MeshStandardMaterial({
    color:0x1a1d24, metalness:0.8, roughness:0.5,
    transparent:true, opacity:0.65, depthWrite:false
  }),
  slitBeam: new THREE.MeshBasicMaterial({
    color:0xc0a0ff, transparent:true, opacity:0,
    blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide
  }),
  slitBeamCore: new THREE.MeshBasicMaterial({
    color:0xe8daff, transparent:true, opacity:0,
    blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide
  }),
  /* ◆ alignMark depthWrite disabled — was causing sort instability against
   *   field planes and water layer when opacity was mid-pulse */
  alignMark: new THREE.MeshBasicMaterial({
    color:0x40ff78, transparent:true, opacity:0, depthWrite:false
  }),
  indicatorR: new THREE.MeshStandardMaterial({ color:0xd04030, metalness:0.5, roughness:0.5, emissive:0x401008, emissiveIntensity:0.6 }),
  steel2: new THREE.MeshStandardMaterial({ color:0x939da8, metalness:1.0, roughness:0.38 }),
  dark:   new THREE.MeshStandardMaterial({ color:0x14161a, metalness:0.55, roughness:0.62 }),
  hose:   new THREE.MeshStandardMaterial({ color:0x1a2a3a, metalness:0.2, roughness:0.7 }),
  slitGlow: new THREE.MeshBasicMaterial({
    color:0xd0b0ff, transparent:true, opacity:0,
    blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide
  }),
};

/* ============ HELPERS ============ */
const cyl = (rt,rb,h,m,s=32,o=false) => new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s,1,o),m);
const box = (w,h,d,m) => new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);

function taperedBox(wTop, hTop, wBot, hBot, height) {
  const geo = new THREE.BufferGeometry();
  const tw = wTop/2, th = hTop/2, bw = wBot/2, bh = hBot/2;
  const y0 = -height/2, y1 = height/2;
  const verts = new Float32Array([
    -bw, y0, -bh,   bw, y0, -bh,   bw, y0,  bh,  -bw, y0,  bh,
    -tw, y1, -th,   tw, y1, -th,   tw, y1,  th,  -tw, y1,  th,
  ]);
  const idx = new Uint16Array([
    0,2,1, 0,3,2,  4,5,6, 4,6,7,
    0,1,5, 0,5,4,  2,3,7, 2,7,6,
    1,2,6, 1,6,5,  3,0,4, 3,4,7,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  return geo;
}

function strutBetween(a, b, thickness, mat) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const len = a.distanceTo(b);
  const strut = box(len, thickness, thickness, mat);
  strut.position.copy(mid);
  const dir = b.clone().sub(a).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0), dir);
  strut.quaternion.copy(quat);
  return strut;
}

// Shared Foundry ground and grid already exist in room.js.

const FRAME_TOP = 3.40;
const POST = 0.12;

[[-2.0,-2.0],[2.0,-2.0],[-2.0,2.0],[2.0,2.0]].forEach(([x,z]) => {
  const post = box(POST, FRAME_TOP, POST, MAT.frame);
  post.position.set(x, FRAME_TOP/2, z);
  post.castShadow = true; post.receiveShadow = true;
  group.add(post);
  const foot = cyl(0.16, 0.20, 0.06, MAT.frame2, 12);
  foot.position.set(x, 0.03, z);
  group.add(foot);
});

for (const z of [-2.0, 2.0]) {
  const brace = box(4.0, 0.10, 0.10, MAT.frame);
  brace.position.set(0, FRAME_TOP - 0.05, z);
  group.add(brace);
}

/* ============================================================
   GRANITE + SUPPORT
   Granite top = GRANITE_Y + 0.10 = 1.05.
   ============================================================ */
const GRANITE_Y = 0.95;
const granite = box(3.0, 0.20, 3.0, MAT.granite);
granite.position.y = GRANITE_Y;
granite.castShadow = true; granite.receiveShadow = true;
group.add(granite);

for (const [sx, sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
  const postPt    = new THREE.Vector3(sx * 2.0, GRANITE_Y, sz * 2.0);
  const granitePt = new THREE.Vector3(sx * 1.4, GRANITE_Y, sz * 1.4);
  group.add(strutBetween(postPt, granitePt, 0.07, MAT.frame));
}

/* ◆ basePlate raised so its bottom clears the granite top by 5 mm.
 *   Previously bottom was exactly at granite top (1.05), causing
 *   z-fighting across the entire 3×3 m granite surface. */
const basePlate = box(1.4, 0.06, 1.4, MAT.frame2);
basePlate.position.y = GRANITE_Y + 0.135;   // center 1.085, spans 1.055 → 1.115
basePlate.castShadow = true; basePlate.receiveShadow = true;
group.add(basePlate);

/* ============================================================
   STAGE
   ◆ Every stacked element has been re-spaced so no two surfaces are coplanar.
   Y stack (world):
     base plate:      1.055 → 1.115   (top = STAGE_Y)
     xStage:          1.118 → 1.168   (3 mm clear of base plate)
     zStage:          1.170 → 1.220   (2 mm clear of xStage)
     chuck:           1.2175 → 1.2625 (2.5 mm overlap hidden inside zStage)
     wafer:           1.263 → 1.271   (touching chuck — 0.5 mm clearance
                                       from chuck top because wafer bottom
                                       is 1.263 vs chuck top 1.2625)
   WAFER_TOP (local Y in stageGroup) = 1.271 - 1.115 = 0.156
   ============================================================ */
const STAGE_Y = GRANITE_Y + 0.165;   // 1.115 = base plate top

const stageGroup = new THREE.Group();
stageGroup.position.set(0, STAGE_Y, 0);
group.add(stageGroup);

const xStage = box(0.70, 0.05, 0.70, MAT.stageMid);
xStage.position.y = 0.028;
xStage.castShadow = true; xStage.receiveShadow = true;
stageGroup.add(xStage);

const zStage = box(0.50, 0.05, 0.50, MAT.stageTop);
zStage.position.y = 0.080;
zStage.castShadow = true; zStage.receiveShadow = true;
stageGroup.add(zStage);

const chuck = cyl(0.36, 0.36, 0.045, MAT.chuck, 48);
chuck.position.y = 0.125;
chuck.castShadow = true; chuck.receiveShadow = true;
stageGroup.add(chuck);

const WAFER_TOP = 0.156;
const wafer = cyl(0.30, 0.30, 0.008, MAT.wafer, 64);
wafer.position.y = 0.152;
wafer.castShadow = true; wafer.receiveShadow = true;
stageGroup.add(wafer);

/* ============================================================
   FIELDS
   ◆ Field 26 × 33 mm → scene 0.052 × 0.066 (ratio 1.269, correct).
   ◆ Field array spacing 1.18× → outer edge 0.179 in X, 0.228 in Z.
   ============================================================ */
const FIELD_W = 0.052;
const FIELD_H = 0.066;
const COLS = 6, ROWS = 6;
const FIELD_SPACING_X = FIELD_W * 1.18;
const FIELD_SPACING_Z = FIELD_H * 1.18;

// Preserve exact original field dimensions and offsets, but reduce all
// 36 fields to ONE instanced draw call with individual scan fractions.
const FIELDS=[];
const FIELD_ORDER=[];
for(let row=0;row<ROWS;row++){
 for(let col=0;col<COLS;col++){
  FIELDS.push({row,col,x:(col-2.5)*FIELD_SPACING_X,z:(row-2.5)*FIELD_SPACING_Z,exposed:false});
 }
 for(let col=0;col<COLS;col++)FIELD_ORDER.push({row,col:row%2?5-col:col});
}
const fieldGeo=new THREE.PlaneGeometry(FIELD_W,FIELD_H);
const fieldScan=new THREE.InstancedBufferAttribute(new Float32Array(36),1);
fieldScan.setUsage(THREE.DynamicDrawUsage);
fieldGeo.setAttribute('aScan',fieldScan);
const fieldShaderVert=`
 attribute float aScan;
 varying vec2 vUv;
 varying float vScan;
 void main(){
  vUv=uv;vScan=aScan;
  gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);
 }`;
const fieldShaderFrag=`
 varying vec2 vUv;
 varying float vScan;
 void main(){
  float lit=step(vUv.y,vScan);
  vec3 col=mix(vec3(0.4784,0.5412,0.6667),vec3(0.5333,0.3333,0.8000),lit);
  gl_FragColor=vec4(col,1.0);
 }`;
const fieldMat=new THREE.ShaderMaterial({vertexShader:fieldShaderVert,fragmentShader:fieldShaderFrag,side:THREE.DoubleSide});
const fieldMesh=new THREE.InstancedMesh(fieldGeo,fieldMat,36);
fieldMesh.name='36 individually scanned exposure fields · instanced';
fieldMesh.rotation.x=-Math.PI/2;
fieldMesh.position.y=WAFER_TOP+.0005;
fieldMesh.frustumCulled=false;
const dummy=new THREE.Object3D();
FIELDS.forEach((f,i)=>{
 dummy.position.set(f.x,-f.z,0);
 dummy.updateMatrix();
 fieldMesh.setMatrixAt(i,dummy.matrix);
});
fieldMesh.instanceMatrix.needsUpdate=true;
stageGroup.add(fieldMesh);
function scanField(index,fraction){
 if(index<0||index>=36)return;
 const v=Math.min(1,Math.max(0,fraction));
 if(fieldScan.array[index]!==v){
  fieldScan.array[index]=v;fieldScan.needsUpdate=true;
 }
}

const ALIGN_MARKS = [];
const ALIGN_MARK_POS = [
  { x: -0.20, z: -0.22 },
  { x:  0.20, z: -0.22 },
  { x: -0.20, z:  0.22 },
  { x:  0.20, z:  0.22 },
];
for (const p of ALIGN_MARK_POS) {
  const group = new THREE.Group();
  group.position.set(p.x, WAFER_TOP + 0.005, p.z);
  stageGroup.add(group);
  const armH = box(0.025, 0.0008, 0.005, MAT.alignMark.clone());
  const armV = box(0.005, 0.0008, 0.025, MAT.alignMark.clone());
  group.add(armH);
  group.add(armV);
  ALIGN_MARKS.push(armH, armV);
}

/* ============================================================
   REFERENCE FRAME
   ============================================================ */
const REF_X = 0.28;
const REF_Z = 0.28;
const REF_BOT = GRANITE_Y + 0.10;
const REF_TOP = 3.28;

for (const [sx, sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
  const rail = box(0.035, REF_TOP - REF_BOT, 0.035, MAT.frame3);
  rail.position.set(sx * REF_X, (REF_BOT + REF_TOP) / 2, sz * REF_Z);
  rail.castShadow = true;
  group.add(rail);

  const pad = cyl(0.05, 0.05, 0.02, MAT.frame2, 12);
  pad.position.set(sx * REF_X, REF_BOT + 0.01, sz * REF_Z);
  group.add(pad);
}

function radialBracket(y, innerR, outerR, mat) {
  for (const [sx, sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
    const start = new THREE.Vector3(sx * innerR, y, sz * innerR);
    const end   = new THREE.Vector3(sx * REF_X, y, sz * REF_Z);
    group.add(strutBetween(start, end, 0.025, mat));
  }
}

/* ============================================================
   LENS COLUMN + BARREL
   ============================================================ */
const LENS_BOT_W = WAFER_TOP + STAGE_Y + 0.02;   // 0.156 + 1.115 + 0.02 = 1.291

const lensElements = [
  { y0: 0.00, y1: 0.12, r: 0.080 },
  { y0: 0.16, y1: 0.36, r: 0.110 },
  { y0: 0.40, y1: 0.62, r: 0.135 },
  { y0: 0.66, y1: 0.86, r: 0.120 },
  { y0: 0.90, y1: 1.00, r: 0.100 },
];

const barrelH = 1.02;
const barrel = cyl(0.155, 0.155, barrelH, MAT.lensBarrel, 40, true);
barrel.position.y = LENS_BOT_W + 0.50;
barrel.renderOrder = 0;
group.add(barrel);

for (const e of lensElements) {
  const h = e.y1 - e.y0;
  const glass = cyl(e.r, e.r, h, MAT.lensGlass, 32);
  glass.position.y = LENS_BOT_W + (e.y0 + e.y1) / 2;
  glass.renderOrder = 1;
  group.add(glass);

  const ringT = cyl(e.r + 0.02, e.r + 0.02, 0.02, MAT.lensRing, 32);
  ringT.position.y = LENS_BOT_W + e.y1 - 0.01;
  group.add(ringT);
  const ringB = cyl(e.r + 0.02, e.r + 0.02, 0.02, MAT.lensRing, 32);
  ringB.position.y = LENS_BOT_W + e.y0 + 0.01;
  group.add(ringB);
}

const LENS_TOP_W = LENS_BOT_W + 1.00;

radialBracket(LENS_BOT_W + 0.06, 0.10, REF_X, MAT.frame3);
radialBracket(LENS_TOP_W - 0.06, 0.10, REF_X, MAT.frame3);

/* Water immersion layer — sits between wafer top (1.271) and lens bottom (1.291) */
const waterLayer = cyl(0.10, 0.10, 0.02, MAT.water, 32);
waterLayer.position.y = WAFER_TOP + STAGE_Y + 0.01;   // 1.281
waterLayer.renderOrder = 3;
group.add(waterLayer);

/* ============================================================
   RETICLE + RAILS
   ◆ PATTERN_H = 4 × FIELD_H = 0.264; RETICLE_SCAN_AMP = PATTERN_H/2 = 0.132
   ============================================================ */
const RETICLE_Y = LENS_TOP_W + 0.04;
const RETICLE_W = 0.30;
const RETICLE_H = 0.30;
const PATTERN_W = 4 * FIELD_W;     // 0.208
const PATTERN_H = 4 * FIELD_H;     // 0.264
const RETICLE_SCAN_AMP = PATTERN_H / 2;   // 0.132

const reticleGroup = new THREE.Group();
reticleGroup.position.set(0, RETICLE_Y, 0);
group.add(reticleGroup);

const reticleGlass = box(RETICLE_W, 0.008, RETICLE_H, MAT.reticleGlass);
reticleGlass.renderOrder = 2;
reticleGroup.add(reticleGlass);

for (const [cx, cz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
  const corner = box(0.03, 0.02, 0.03, MAT.reticleFrame);
  corner.position.set(cx * (RETICLE_W/2), 0, cz * (RETICLE_H/2));
  reticleGroup.add(corner);
}

for (let i = 0; i < 10; i++) {
  const line = box(0.005, 0.002, PATTERN_H * 0.95, MAT.dark);
  line.position.set(-PATTERN_W * 0.45 + i * PATTERN_W * 0.10, 0.005, 0);
  reticleGroup.add(line);
}

for (const sx of [-1, 1]) {
  const rail = box(0.025, 0.025, REF_Z * 2 + 0.06, MAT.frame3);
  rail.position.set(sx * REF_X, RETICLE_Y - 0.025, 0);
  group.add(rail);
}

/* ============================================================
   ILLUMINATOR
   ============================================================ */
const ILLUM_BOT_W = 2.65;
const ILLUM_TOP_W = 2.99;
for (const y of [ILLUM_BOT_W, (ILLUM_BOT_W + ILLUM_TOP_W) / 2, ILLUM_TOP_W]) {
  const ring = cyl(0.16, 0.16, 0.012, MAT.lensRing, 24);
  ring.position.set(0, y, 0);
  group.add(ring);
  const ringGlass = cyl(0.14, 0.14, 0.010, MAT.lensGlass, 24);
  ringGlass.position.set(0, y, 0);
  ringGlass.renderOrder = 1;
  group.add(ringGlass);
}

radialBracket(ILLUM_BOT_W, 0.14, REF_X, MAT.frame3);

/* ============================================================
   CROWN + MIRROR
   ============================================================ */
const CROWN_Y = REF_TOP - 0.04;
for (const [sx, sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
  const start = new THREE.Vector3(sx * REF_X, REF_TOP, sz * REF_Z);
  const end   = new THREE.Vector3(0, CROWN_Y, 0);
  group.add(strutBetween(start, end, 0.025, MAT.frame3));
}
const crownBracket = box(0.10, 0.06, 0.10, MAT.frame3);
crownBracket.position.set(0, CROWN_Y, 0);
group.add(crownBracket);

const MIRROR_Y = 3.22;
const mirror = box(0.30, 0.02, 0.20, MAT.mirror);
mirror.position.set(0, MIRROR_Y, 0);
mirror.rotation.x = -Math.PI / 4;
group.add(mirror);

const mirrorMount = box(0.06, 0.03, 0.06, MAT.frame3);
mirrorMount.position.set(0, MIRROR_Y + 0.03, 0);
group.add(mirrorMount);

/* ============================================================
   LASER + BDU
   ◆ laserPos.y raised to 1.202 — box bottom was coplanar with granite top
   ============================================================ */
const laserPos = new THREE.Vector3(-1.2, 1.202, 0);
const laserBox = box(0.50, 0.30, 0.35, MAT.laserBox);
laserBox.position.copy(laserPos);
laserBox.castShadow = true; laserBox.receiveShadow = true;
group.add(laserBox);

const laserWindow = cyl(0.05, 0.05, 0.012, MAT.slitGlow.clone(), 16);
laserWindow.rotation.x = Math.PI / 2;
laserWindow.position.set(laserPos.x, laserPos.y, laserPos.z + 0.18);
group.add(laserWindow);

const bduTopY = MIRROR_Y;
const bduBotY = laserPos.y + 0.15;
const bduVertH = bduTopY - bduBotY;
const bduVert = cyl(0.04, 0.04, bduVertH, MAT.bduDuct, 12);
bduVert.position.set(laserPos.x, (bduBotY + bduTopY) / 2, 0);
bduVert.renderOrder = 4;
group.add(bduVert);

const bduCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(laserPos.x, bduTopY, 0),
  new THREE.Vector3(-0.9, bduTopY, 0),
  new THREE.Vector3(-0.5, bduTopY, 0),
  new THREE.Vector3(-0.1, bduTopY, 0),
  new THREE.Vector3(0, bduTopY, 0),
]);
const bduHoriz = new THREE.Mesh(
  new THREE.TubeGeometry(bduCurve, 24, 0.04, 8, false),
  MAT.bduDuct
);
bduHoriz.renderOrder = 4;
group.add(bduHoriz);

const bduBeamVert = cyl(0.015, 0.015, bduVertH - 0.10, MAT.slitBeam.clone(), 8);
bduBeamVert.position.set(laserPos.x, (bduBotY + bduTopY) / 2, 0);
bduBeamVert.renderOrder = 5;
group.add(bduBeamVert);

const bduBeamHoriz = new THREE.Mesh(
  new THREE.TubeGeometry(bduCurve, 24, 0.018, 8, false),
  MAT.slitBeam.clone()
);
bduBeamHoriz.renderOrder = 5;
group.add(bduBeamHoriz);

const bduClamp = strutBetween(
  new THREE.Vector3(laserPos.x, 2.80, 0),
  new THREE.Vector3(-2.0, 2.80, 2.0),
  0.030, MAT.frame3
);
group.add(bduClamp);

/* ============================================================
   SLIT BEAMS
   ============================================================ */
const ILLUM_TOP = MIRROR_Y;
const ILLUM_BOT = RETICLE_Y + 0.01;
const ILLUM_H = ILLUM_TOP - ILLUM_BOT;
const illumSlit = new THREE.Mesh(
  taperedBox(0.20, 0.06, 0.20, 0.06, ILLUM_H),
  MAT.slitBeam.clone()
);
illumSlit.position.y = (ILLUM_TOP + ILLUM_BOT) / 2;
illumSlit.renderOrder = 10;
group.add(illumSlit);

const PROJECT_TOP = RETICLE_Y - 0.006;
const PROJECT_BOT = WAFER_TOP + STAGE_Y + 0.005;
const PROJECT_H = PROJECT_TOP - PROJECT_BOT;
const projSlit = new THREE.Mesh(
  taperedBox(0.20, 0.06, 0.05, 0.015, PROJECT_H),
  MAT.slitBeam.clone()
);
projSlit.position.y = (PROJECT_TOP + PROJECT_BOT) / 2;
projSlit.renderOrder = 10;
group.add(projSlit);

const projSlitCore = new THREE.Mesh(
  taperedBox(0.13, 0.038, 0.030, 0.009, PROJECT_H),
  MAT.slitBeamCore.clone()
);
projSlitCore.position.y = (PROJECT_TOP + PROJECT_BOT) / 2;
projSlitCore.renderOrder = 11;
group.add(projSlitCore);

/* ◆ Exposure spot at world Y 1.274 (3 mm above field plane at 1.2715) */
const exposureSpot = new THREE.Mesh(
  new THREE.PlaneGeometry(0.05, 0.015),
  MAT.slitGlow.clone()
);
exposureSpot.rotation.x = -Math.PI / 2;
exposureSpot.position.set(0, WAFER_TOP + STAGE_Y + 0.003, 0);
exposureSpot.renderOrder = 12;
group.add(exposureSpot);

/* ============================================================
   LABELS
   ============================================================ */

 const phaseColors={};
 const labels=[
  ['ArF laser · 193 nm',laserPos.x,laserPos.y+.30,laserPos.z],
  ['Reticle · 4×',0,RETICLE_Y+.24,0],
  ['NA 1.35 · immersion',.22,LENS_BOT_W+.5,0],
  ['300 mm wafer stage',.58,STAGE_Y+.25,0]
 ].map(([title,x,y,z])=>{
  const el=document.createElement('div');
  el.className='label3d litho-sub-label';
  el.textContent=title;
  el.style.color='#c4adff';el.style.borderColor='#8d78d4';
  el.style.display='none';document.body.appendChild(el);
  return {el,x,y,z};
 });
 const v=new THREE.Vector3();
 function labelsVisible(visible){
  labels.forEach(({el,x,y,z})=>{
   if(!visible){el.style.display='none';return;}
   v.set(LITHO_X+x,y,z).project(camera);
   const onScreen=v.z>=-1&&v.z<=1&&Math.abs(v.x)<=.98&&Math.abs(v.y)<=.98;
   el.style.display=onScreen?'block':'none';
   if(!onScreen)return;
   const sx=(v.x*.5+.5)*window.innerWidth,sy=(-v.y*.5+.5)*window.innerHeight;
   el.style.transform=`translate(-50%,-100%) translate(${sx}px,${sy}px)`;
  });
 }
 const activeBeam=[laserWindow,bduBeamVert,bduBeamHoriz,illumSlit,projSlit,projSlitCore,exposureSpot];
 activeBeam.forEach(m=>{m.visible=false;});
 const animated=new Set([stageGroup,reticleGroup,...activeBeam]);
 group.children.forEach(o=>{if(o.isMesh&&o.material?.transparent)animated.add(o);});
 const staticStats=batchStatic?mergeStaticDrawCalls(group,{exclude:animated}):null;
 // Low cost: most rigid equipment does not cast, but major structural
 // geometry still receives the existing shared lights and PBR environment.
 let shadowCasters=0;
 group.traverse(o=>{
  if(!o.isMesh)return;
  o.castShadow=!o.material?.transparent && shadowCasters++<12;
  o.receiveShadow=false;
 });
 function reset(){
  fieldScan.array.fill(0);fieldScan.needsUpdate=true;
  FIELDS.forEach(f=>f.exposed=false);
  stageGroup.position.set(0,STAGE_Y,0);
  reticleGroup.position.z=0;
  activeBeam.forEach(m=>{m.visible=false;});
  ALIGN_MARKS.forEach(m=>{m.material.opacity=0;m.visible=false;});
 }
 function setVisual(s,dt,time=0){
  const phase=s.idx;
  let targetX=0,targetZ=0,reticleTarget=0;
  if(phase===1){
   const marks=[[-.20,-.22],[.20,-.22],[-.20,.22],[.20,.22]];
   const i=Math.min(3,Math.floor(s.alignment*4));
   targetX=-marks[i][0];targetZ=-marks[i][1];
   ALIGN_MARKS.forEach((m,k)=>{
    m.visible=true;
    const mi=Math.floor(k/2);
    m.material.opacity=mi<i?.85:mi===i?.4+.5*Math.abs(Math.sin(s.alignment*12*Math.PI)):.12;
   });
  }else{
   ALIGN_MARKS.forEach(m=>{m.visible=false;});
  }
  if(phase===2){
   const order=FIELD_ORDER[s.fieldIndex];
   const f=FIELDS[order.row*6+order.col];
   const within=(s.local*36)%1;
   const stepping=within<.28&&!s.beamOn;
   const frac=stepping?within/.28:s.scanProgress;
   targetX=-f.x;
   targetZ=-(f.z+FIELD_H/2)+(stepping?0:frac*FIELD_H);
   reticleTarget=stepping?-.132+frac*.264:.132-frac*.264;
   for(let i=0;i<s.fieldIndex;i++){
    const v=FIELD_ORDER[i];scanField(v.row*6+v.col,1);
   }
   scanField(order.row*6+order.col,s.scanProgress);
  }else if(phase>=3){
   for(let i=0;i<36;i++)scanField(i,1);
  }
  const lerpStage=Math.min(1,dt*25);
  stageGroup.position.x+=(targetX-stageGroup.position.x)*lerpStage;
  stageGroup.position.z+=(targetZ-stageGroup.position.z)*lerpStage;
  reticleGroup.position.z+=(reticleTarget-reticleGroup.position.z)*Math.min(1,dt*20);
  const b=s.beamOn?1:0;
  const pulse=.85+Math.sin(time*8)*.1;
  const op=[b*.90,b*.85,b*.85,b*.55,b*.40,b*.85*pulse,b*.90*pulse];
  activeBeam.forEach((m,i)=>{
   m.visible=b>0;
   m.material.opacity=op[i];
  });
  exposureSpot.scale.setScalar(1+Math.sin(time*6)*.05);
  labelsVisible(group.visible);
 }
 reset();
 return {group,stats:staticStats,stageGroup,reticleGroup,fieldMesh,fieldScan,
  bodyParts:{lensElements:lensElements.length,fieldCount:36,
   detailedOpticalBarrel:!!barrel,water:!!waterLayer,beamCount:activeBeam.length,
   reticleGlass:!!reticleGlass,granite:!!granite},
  setVisual,reset,labelsVisible};
}
