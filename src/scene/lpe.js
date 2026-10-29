import * as THREE from 'three';
import {TUBE_R,TUBE_LEN,TUBE_X,FORMER_IN,FORMER_OUT,COIL_R,INSUL_OUT,SHELL_OUT,WELL_OFFSETS,SLIDER_HALF,PARK_X,UNLOAD_X,WELL_W,WELL_D,WELL_H,WALL_W,BASE_TOP,SUB_TOP,SUB_THICK,SUB_SIZE,SLIDER_BOT,MELT_H,BRIDGE_R,CONTACT_THR,BINS,ZONES} from '../config/geometry.js';

export function buildLpe({scene,MAT,clipPlane,cyl,box,boltRing,tubeAlong,makeCoil,annularTube}) {
const meltMats = BINS.map(b => new THREE.MeshStandardMaterial({
  color: b.color, metalness: 0.95, roughness: 0.10,
  emissive: 0x331800, emissiveIntensity: 0.45 + b.glow * 0.3
}));
const baseMeltEmissive = BINS.map(b => 0.45 + b.glow * 0.3);


/* Floor/grid are shared lab infrastructure in scene/room.js. */

/* ============ LPE MACHINE ============ */
const machine = new THREE.Group();
machine.position.y = 2.65;
scene.add(machine);

const frame = new THREE.Group();
machine.add(frame);

const LEG_TOP = -1.36, LEG_BOT = -2.65;
const LEG_H = LEG_TOP - LEG_BOT;

for (const x of [-4.55, 4.55]) {
  for (const z of [-0.70, 0.70]) {
    const leg = box(0.13, LEG_H, 0.13, MAT.steel3);
    leg.position.set(x, (LEG_TOP + LEG_BOT) / 2, z);
    frame.add(leg);
    const foot = cyl(0.17, 0.20, 0.06, MAT.dark, 14);
    foot.position.set(x, LEG_BOT + 0.03, z);
    frame.add(foot);
  }
  const cross = box(0.11, 0.11, 1.55, MAT.steel3);
  cross.position.set(x, LEG_TOP, 0);
  frame.add(cross);
}
for (const z of [-0.70, 0.70]) {
  const rail = box(9.25, 0.14, 0.14, MAT.steel3);
  rail.position.set(0, -1.29, z);
  frame.add(rail);
}

const zoneCoils = [];
const zoneLights = [];

ZONES.forEach((zone, i) => {
  const cx = zone.x, len = zone.len;
  const shellMesh = annularTube(INSUL_OUT, SHELL_OUT, len, MAT.shell, 40);
  shellMesh.position.x = cx;
  machine.add(shellMesh);

  const insulMesh = annularTube(COIL_R + 0.02, INSUL_OUT, len - 0.02, MAT.insul, 32);
  insulMesh.position.x = cx;
  machine.add(insulMesh);

  const formerMesh = annularTube(FORMER_IN, FORMER_OUT, len - 0.04, MAT.former, 32);
  formerMesh.position.x = cx;
  machine.add(formerMesh);

  const coilMat = MAT.coil.clone();
  coilMat.clippingPlanes = [clipPlane];
  coilMat.clipShadows = true;
  const coil = makeCoil(COIL_R, cx - len / 2 + 0.10, cx + len / 2 - 0.10, 15, 0.024, coilMat);
  machine.add(coil);
  zoneCoils.push(coil);

  const tcFeed = cyl(0.045, 0.045, 0.12, MAT.ceramic, 10);
  tcFeed.position.set(cx, -SHELL_OUT - 0.02, 0);
  machine.add(tcFeed);

  const tcSheath = cyl(0.018, 0.018, SHELL_OUT - FORMER_OUT + 0.10, MAT.tcSheath, 10);
  tcSheath.position.set(cx, -(SHELL_OUT + FORMER_OUT) / 2, 0);
  machine.add(tcSheath);

  const tcTip = cyl(0.024, 0.024, 0.03, MAT.copper, 8);
  tcTip.position.set(cx, -FORMER_OUT - 0.02, 0);
  machine.add(tcTip);

  const zl = new THREE.PointLight(0xff6a2a, 9, 5.4, 2);
  zl.position.set(cx, -0.05, -0.60);
  machine.add(zl);
  zoneLights.push(zl);
});

for (const sign of [-1, +1]) {
  const endX = sign * (ZONES[3].x + ZONES[3].len / 2);
  const plate = annularTube(TUBE_R + 0.02, SHELL_OUT, 0.06, MAT.steel2, 32);
  plate.position.x = endX;
  machine.add(plate);
  const bolts = boltRing(SHELL_OUT - 0.08, 12, MAT.steel3);
  bolts.position.x = endX + sign * 0.04;
  machine.add(bolts);
}

for (const sx of [-3.5, 3.5]) {
  const saddle = new THREE.Mesh(
    new THREE.TorusGeometry(SHELL_OUT + 0.04, 0.055, 6, 24, Math.PI * 0.8),
    MAT.steel2
  );
  saddle.rotation.y = Math.PI / 2;
  saddle.rotation.z = -Math.PI * 0.9;
  saddle.position.set(sx, 0, 0);
  frame.add(saddle);
}

const tube = cyl(TUBE_R, TUBE_R, TUBE_LEN, MAT.glass, 40, true);
tube.rotation.z = Math.PI / 2;
tube.renderOrder = 10;
tube.castShadow = false; tube.receiveShadow = false;
machine.add(tube);

function endFitting(x, dir) {
  const g = new THREE.Group();
  g.position.x = x;
  const flange = cyl(0.62, 0.62, 0.10, MAT.steel2, 32);
  flange.rotation.z = Math.PI / 2; g.add(flange);
  const oring = new THREE.Mesh(new THREE.TorusGeometry(0.50, 0.045, 6, 24), MAT.rubber);
  oring.rotation.y = Math.PI / 2; oring.position.x = -dir * 0.06; g.add(oring);
  const cap = cyl(0.50, 0.46, 0.16, MAT.steel2, 32);
  cap.rotation.z = Math.PI / 2; cap.position.x = dir * 0.13; g.add(cap);
  const bolts = boltRing(0.55, 16); bolts.position.x = dir * 0.055; g.add(bolts);

  const waterCoil = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.024, 6, 24), MAT.copper);
  waterCoil.rotation.y = Math.PI / 2;
  waterCoil.position.x = dir * 0.02;
  g.add(waterCoil);

  const hoseY = -0.55, hoseZ = 0.30;
  g.add(tubeAlong([
    [dir * 0.02, hoseY, hoseZ], [dir * 0.08, hoseY - 0.30, hoseZ + 0.05],
    [dir * 0.15, hoseY - 0.70, hoseZ + 0.10], [dir * 0.22, hoseY - 1.10, hoseZ + 0.18],
    [dir * 0.28, hoseY - 1.55, hoseZ + 0.28], [dir * 0.32, hoseY - 2.10, hoseZ + 0.35],
  ], 0.032, MAT.hoseBlue, 32));
  g.add(tubeAlong([
    [dir * 0.02, hoseY, -hoseZ], [dir * 0.08, hoseY - 0.30, -hoseZ - 0.05],
    [dir * 0.15, hoseY - 0.70, -hoseZ - 0.10], [dir * 0.22, hoseY - 1.10, -hoseZ - 0.18],
    [dir * 0.28, hoseY - 1.55, -hoseZ - 0.28], [dir * 0.32, hoseY - 2.10, -hoseZ - 0.35],
  ], 0.032, MAT.hoseRed, 32));

  machine.add(g);
  return g;
}

const leftEnd  = endFitting(-TUBE_X, -1);
const rightEnd = endFitting( TUBE_X,  1);

const boatGroup = new THREE.Group();
machine.add(boatGroup);

const basePlate = box(5.60, 0.08, 0.55, MAT.graphiteDark);
basePlate.position.set(0, BASE_TOP - 0.04, 0);
boatGroup.add(basePlate);

for (const [sx, sz, w, d] of [
  [ 0,  0.12, 0.27, 0.03], [ 0, -0.12, 0.27, 0.03],
  [ 0.12, 0, 0.03, 0.27], [-0.12, 0, 0.03, 0.27],
]) {
  const rim = box(w, 0.008, d, MAT.graphite);
  rim.position.set(sx, BASE_TOP + 0.004, sz);
  boatGroup.add(rim);
}

const substrate = box(SUB_SIZE, SUB_THICK, SUB_SIZE, MAT.substrate);
substrate.position.set(0, SUB_TOP - SUB_THICK / 2, 0);
boatGroup.add(substrate);

const subRing = new THREE.Mesh(
  new THREE.RingGeometry(0.13, 0.15, 24),
  new THREE.MeshBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: 0.30, side: THREE.DoubleSide })
);
subRing.rotation.x = -Math.PI / 2;
subRing.position.set(0, BASE_TOP + 0.0008, 0);
boatGroup.add(subRing);

const growthLayersGroup = new THREE.Group();
boatGroup.add(growthLayersGroup);

const growthLayers = [];
const LAYER_BASE_Y = SUB_TOP + 0.0008;
let cumulativeHeight = 0;
const MIN_VIS = 0.0020, VIS_FACTOR = 0.0060;

BINS.forEach((b, i) => {
  if (b.thickness === null) { growthLayers[i] = null; return; }
  const h = MIN_VIS + b.thickness * VIS_FACTOR;
  const mat = new THREE.MeshStandardMaterial({
    color: b.color, metalness: 0.85, roughness: 0.15,
    emissive: b.color, emissiveIntensity: 0.12
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(SUB_SIZE * 0.86, 1, SUB_SIZE * 0.86), mat);
  mesh.scale.y = 0.0001;
  mesh.position.y = LAYER_BASE_Y + cumulativeHeight;
  mesh.visible = false;
  growthLayersGroup.add(mesh);
  growthLayers[i] = { mesh, material: mat, height: h, baseY: LAYER_BASE_Y + cumulativeHeight, deposited: false, active: false };
  cumulativeHeight += h;
});



const meltBridge = new THREE.Mesh(
  new THREE.CylinderGeometry(BRIDGE_R, BRIDGE_R, 1, 16),
  new THREE.MeshStandardMaterial({
    color: 0xc0c4c8, metalness: 0.95, roughness: 0.10,
    emissive: 0x331800, emissiveIntensity: 0.9
  })
);
meltBridge.visible = false;
boatGroup.add(meltBridge);

const contactRing = new THREE.Mesh(
  new THREE.CylinderGeometry(0.10, 0.10, 0.003, 24, 1, true),
  new THREE.MeshBasicMaterial({ color: 0x7fd6ff, transparent: true, opacity: 0, side: THREE.DoubleSide })
);
boatGroup.add(contactRing);

const growthLight = new THREE.PointLight(0x7fd6ff, 0, 1.4, 2);
growthLight.position.set(0, SUB_TOP + 0.15, 0);
boatGroup.add(growthLight);

const sliderGroup = new THREE.Group();
sliderGroup.position.x = PARK_X;
boatGroup.add(sliderGroup);

for (const sign of [-1, +1]) {
  const endBlock = box(0.14, WELL_H, 0.44, MAT.graphite);
  endBlock.position.set(sign * (SLIDER_HALF - 0.07), SLIDER_BOT + WELL_H / 2, 0);
  sliderGroup.add(endBlock);
}
for (let i = 0; i < 4; i++) {
  const midX = (WELL_OFFSETS[i] + WELL_OFFSETS[i + 1]) / 2;
  const wall = box(WALL_W, WELL_H, 0.44, MAT.graphite);
  wall.position.set(midX, SLIDER_BOT + WELL_H / 2, 0);
  sliderGroup.add(wall);
}

const melts = [];
BINS.forEach((b, i) => {
  const melt = box(WELL_W - 0.005, MELT_H, WELL_D - 0.005, meltMats[i]);
  melt.position.set(WELL_OFFSETS[i], SLIDER_BOT + MELT_H / 2, 0);
  sliderGroup.add(melt);
  melts.push({ mesh: melt, baseY: melt.position.y });
});

const sliderGlow = new THREE.PointLight(0xff8a3a, 3.2, 2.6, 2);
sliderGlow.position.set(0, SLIDER_BOT + WELL_H * 0.6, 0);
sliderGroup.add(sliderGlow);

const ROD_Y = SLIDER_BOT + WELL_H / 2;
const ROD_LEN = 7.0;
const pushRod = cyl(0.030, 0.030, ROD_LEN, MAT.graphiteDark, 12);
pushRod.rotation.z = Math.PI / 2;
pushRod.position.set(SLIDER_HALF + ROD_LEN / 2, ROD_Y, 0);
sliderGroup.add(pushRod);

const rodHandle = cyl(0.085, 0.085, 0.22, MAT.steel2, 14);
rodHandle.rotation.z = Math.PI / 2;
rodHandle.position.set(SLIDER_HALF + ROD_LEN + 0.11, ROD_Y, 0);
sliderGroup.add(rodHandle);
const rodKnob = cyl(0.12, 0.12, 0.06, MAT.copper, 14);
rodKnob.rotation.z = Math.PI / 2;
rodKnob.position.set(SLIDER_HALF + ROD_LEN + 0.25, ROD_Y, 0);
sliderGroup.add(rodKnob);

const bellowsGroup = new THREE.Group();
bellowsGroup.position.set(TUBE_X + 0.12, ROD_Y, 0);
machine.add(bellowsGroup);
for (let i = 0; i < 9; i++) {
  const fold = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.026, 6, 16), MAT.steel3);
  fold.rotation.y = Math.PI / 2;
  fold.position.x = i * 0.052;
  bellowsGroup.add(fold);
}

const gas = new THREE.Group();
machine.add(gas);

leftEnd.add(tubeAlong([
  [0, 0, 0], [-0.40, 0, 0.05], [-0.40, -0.75, 0.20], [-0.40, -1.30, 0.20],
], 0.055, MAT.steel3, 32));

const inletValve = cyl(0.11, 0.11, 0.20, MAT.copper, 14);
inletValve.position.set(-0.40, -0.85, 0.20);
inletValve.rotation.x = Math.PI / 2;
leftEnd.add(inletValve);
const inletWheel = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.022, 6, 16), MAT.copper);
inletWheel.position.set(-0.40, -0.85, 0.20);
inletWheel.rotation.x = Math.PI / 2;
leftEnd.add(inletWheel);

const pdGroup = new THREE.Group();
pdGroup.position.set(-7.60, -0.65, 0.15);
gas.add(pdGroup);
const pdTube = cyl(0.075, 0.075, 1.10, MAT.pd, 16);
pdTube.rotation.z = Math.PI / 2; pdGroup.add(pdTube);
const pdHeat = cyl(0.10, 0.10, 0.55, MAT.hotPd, 16);
pdHeat.rotation.z = Math.PI / 2; pdGroup.add(pdHeat);

const pgGroup = new THREE.Group();
pgGroup.position.set(-6.60, 0.10, 0.20);
pgGroup.rotation.y = -0.25;
gas.add(pgGroup);
const pgFace = new THREE.Mesh(new THREE.CircleGeometry(0.105, 20), MAT.gaugeFace);
pgFace.position.z = 0.001; pgGroup.add(pgFace);
const pgRim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.011, 6, 20), MAT.steel2);
pgGroup.add(pgRim);

const mfcGroup = new THREE.Group();
mfcGroup.position.set(-6.05, -0.55, 0.20);
gas.add(mfcGroup);
for (let i = 0; i < 2; i++) {
  const mfc = box(0.34, 0.22, 0.24, MAT.dark);
  mfc.position.set(i * 0.44, 0, 0); mfcGroup.add(mfc);
}

gas.add(tubeAlong([
  [-7.60, -0.65, 0.15], [-7.10, -0.65, 0.18], [-6.80, -0.55, 0.20],
  [-6.60, -0.30, 0.20], [-6.60, 0.00, 0.20],
], 0.030, MAT.steel3, 32));
gas.add(tubeAlong([
  [-6.60, 0.10, 0.20], [-6.45, 0.05, 0.20], [-6.25, -0.20, 0.20],
  [-6.05, -0.30, 0.20], [-6.05, -0.40, 0.20],
], 0.030, MAT.steel3, 32));
gas.add(tubeAlong([
  [-6.05, -0.66, 0.20], [-6.05, -0.85, 0.20], [-5.83, -0.85, 0.20],
  [-5.61, -0.85, 0.20], [-5.61, -0.66, 0.20],
], 0.030, MAT.steel3, 32));
gas.add(tubeAlong([
  [-5.83, -0.85, 0.20], [-5.83, -1.20, 0.22], [-6.00, -1.50, 0.22],
  [-6.40, -1.50, 0.22], [-6.60, -1.40, 0.20], [-6.70, -1.30, 0.20],
], 0.030, MAT.steel3, 48));

const exhaust = new THREE.Group();
exhaust.position.set(7.05, -1.55, 0.20);
machine.add(exhaust);
rightEnd.add(tubeAlong([
  [0, 0.30, 0], [0.35, 0.10, 0.10], [0.60, -0.40, 0.15],
  [0.75, -0.90, 0.18], [0.75, -1.33, 0.20],
], 0.045, MAT.steel3, 32));

const bubShell = cyl(0.13, 0.13, 0.40, MAT.bubblerGlass, 16);
exhaust.add(bubShell);
const oil = cyl(0.115, 0.115, 0.18, MAT.oil, 16);
oil.position.y = -0.10; exhaust.add(oil);

const bubbles = [];
for (let i = 0; i < 14; i++) {
  const r = 0.010 + Math.random() * 0.008;
  const b = new THREE.Mesh(new THREE.SphereGeometry(r, 5, 4), MAT.bubble);
  b.userData = { phase: Math.random(), speed: 0.55 + Math.random() * 0.55,
                 baseX: (Math.random() - 0.5) * 0.11 };
  b.position.set(b.userData.baseX, -0.19, (Math.random() - 0.5) * 0.11);
  exhaust.add(b); bubbles.push(b);
}

const cpBacking = box(2.80, 0.72, 0.04, MAT.steel3);
cpBacking.position.set(-2.30, -0.95, 0.80);
machine.add(cpBacking);

const pidRack = new THREE.Group();
pidRack.position.set(-2.50, -0.88, 0.86);
machine.add(pidRack);
const pidBody = box(0.90, 0.42, 0.16, MAT.dark);
pidRack.add(pidBody);

const pidScreens = [];
for (let i = 0; i < 4; i++) {
  const dx = -0.315 + i * 0.21;
  const pvStrip = box(0.14, 0.028, 0.003,
    new THREE.MeshStandardMaterial({ color: 0x001a05, emissive: 0xff5a10, emissiveIntensity: 2.0 }));
  pvStrip.position.set(dx, 0.09, 0.083);
  pidRack.add(pvStrip);
  const svStrip = box(0.14, 0.024, 0.003,
    new THREE.MeshStandardMaterial({ color: 0x001a05, emissive: 0x36ff78, emissiveIntensity: 1.8 }));
  svStrip.position.set(dx, 0.045, 0.083);
  pidRack.add(svStrip);
  pidScreens.push({ pvStrip, svStrip });
}

const scrGroup = new THREE.Group();
scrGroup.position.set(-1.55, -0.88, 0.86);
machine.add(scrGroup);
const scrBody = box(0.55, 0.34, 0.20, MAT.dark);
scrGroup.add(scrBody);

const otcBox = new THREE.Group();
otcBox.position.set(-3.35, -0.88, 0.86);
machine.add(otcBox);
const otcBody = box(0.28, 0.24, 0.14, MAT.dark);
otcBox.add(otcBody);
const otcLed = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), MAT.ledR);
otcLed.position.set(0.08, 0.04, 0.071);
otcBox.add(otcLed);


return {machine,zoneCoils,zoneLights,growthLayers,growthLayersGroup,contactRing,meltBridge,melts,sliderGroup,subRing,substrate,growthLight,sliderGlow,bubbles,pidScreens,otcLed,inletWheel,meltMats,baseMeltEmissive};
}
