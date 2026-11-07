import * as THREE from 'three';
import {mergeStaticDrawCalls} from '../scene/merge-static.js';
// One renderer/camera/light rig, shared with the seven existing Foundry bays.
export const MOCVD_BAY_X=110;
export function buildMocvd({scene}){
 const group=new THREE.Group();
 group.name='MOCVD · six-wafer III–V reactor';
 group.position.x=MOCVD_BAY_X;scene.add(group);
 const BATCH_SIZE=6;
 const cutState={value:.58};
 const cutPlane=new THREE.Plane(new THREE.Vector3(0,0,-1),1.15-1.20*cutState.value);
 function clippedMat(mat){mat.clippingPlanes=[cutPlane];mat.clipShadows=true;return mat;}
/* ── MATERIALS ── */
function std(color, metalness, roughness, opts = {}) {
  // Material constructor converts hex colors to THREE.Color correctly.
  // Never Object.assign a numeric hex value over material.emissive.
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...opts });
}

// Clipped (chamber shell)
const matSteelWall  = clippedMat(std(0x3a4a60, 0.82, 0.30));
const matSteelRim   = clippedMat(std(0x6a7a90, 0.92, 0.20));
const matWaterJacket= clippedMat(std(0x2a6aa8, 0.92, 0.20, { emissive: 0x1030a0, emissiveIntensity: 0.10 }));
const matShowerJacket = std(0x2a6aa8, 0.92, 0.20, { emissive: 0x1030a0, emissiveIntensity: 0.10 });

// Unclipped (internal + external)
const matGraphite   = std(0x141414, 0.55, 0.68, { emissive: 0xff3010, emissiveIntensity: 0 });
const matGraphiteRim= std(0x1e1e1e, 0.60, 0.60);
const matPocket     = std(0x0e0e0e, 0.50, 0.75, {
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
});
const matCopper     = std(0xc07030, 0.92, 0.30, { emissive: 0x6a2a10, emissiveIntensity: 0.0 });
const matCopperDark = std(0x9a5520, 0.90, 0.35);
const matCeramic    = std(0xe8e0d0, 0.10, 0.62);
const matShowerBody = std(0x2a3648, 0.85, 0.28);
const matShowerFace = std(0x5a6a7a, 0.96, 0.12);
const matCoolRing   = std(0x4a7aa8, 0.88, 0.24);
const matBaratron   = std(0x9aa0a8, 0.92, 0.22);
const matSteelDark  = std(0x1a2431, 0.72, 0.42);

// External
const matSteelExt    = std(0x6a7a90, 0.92, 0.20);
const matSteelDarkExt= std(0x1a2431, 0.72, 0.42);
const matCoolRingExt = std(0x4a7aa8, 0.88, 0.24);
const matFrame       = std(0x1a2431, 0.72, 0.46);
const matFrameRail   = std(0x2a3648, 0.78, 0.38);
const matLeg         = std(0x1a2431, 0.72, 0.42);
const matGasPanel    = std(0x2a3648, 0.80, 0.36);
const matMFCFace     = std(0x1a2431, 0.72, 0.42);
const matGasLine     = std(0x8a9aaa, 0.92, 0.20);
const matHeatedLine  = std(0xc89070, 0.88, 0.28);
const matLineMesh    = std(0x8a8a8a, 0.75, 0.55, {
  transparent: true, opacity: 0.27, depthWrite: false
});
const matLoadLock    = std(0x3a4a60, 0.78, 0.30);
const matPump        = std(0x2a3648, 0.82, 0.36);
const matScrubber    = std(0x2a3648, 0.75, 0.40);
// Transparent vessel with a contained liquid core, not two overlapping
// opaque cylinders. No depth writes from the shell or heater jacket.
const matBubbler     = new THREE.MeshPhysicalMaterial({
  color: 0xa8b0b8, metalness: 0.18, roughness: 0.25,
  transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide
});
const matCassette    = std(0x3a4a60, 0.85, 0.30);
const matForeline    = std(0x8a5a30, 0.90, 0.25);
const matActuator    = std(0x6a7a8a, 0.85, 0.30);
const matCable       = std(0x1a1e24, 0.35, 0.75);

const matWafer       = std(0x4a5a6a, 0.88, 0.24);
const matFloor       = new THREE.MeshStandardMaterial({ color: 0x0a1219, roughness: 0.92, metalness: 0.08 });
const matLed         = new THREE.MeshStandardMaterial({ color: 0x7fc4ff, emissive: 0x7fc4ff, emissiveIntensity: 0.5 });
const matMFCDisplay  = new THREE.MeshBasicMaterial({ color: 0x2a8a3a });
const matViewport    = new THREE.MeshPhysicalMaterial({
  color: 0x4a7aa8, metalness: 0.0, roughness: 0.05,
  transparent: true, opacity: 0.38, depthWrite: false
});
const matBubblerHeat = new THREE.MeshPhysicalMaterial({
  color: 0xff8030, metalness: 0.0, roughness: 0.20,
  transparent: true, opacity: 0.22, depthWrite: false,
  emissive: 0xff5010, emissiveIntensity: 0.35
});
const matBubblerLiq  = new THREE.MeshPhysicalMaterial({
  color: 0x4a8aaa, metalness: 0.0, roughness: 0.10,
  transparent: false, opacity: 1
});

// During growth the deposit has real topological thickness in the visual
// (exaggerated). Keep its material opaque and hide it at zero thickness;
// blending a transparent coplanar film against a wafer causes depth flicker.
const matGrowLayer = new THREE.MeshStandardMaterial({
  color: 0xff7a2a, metalness: 0.40, roughness: 0.35,
  emissive: 0xff5010, emissiveIntensity: 0.08,
  transparent: false, depthWrite: true,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
});
const matGasParticle = new THREE.MeshBasicMaterial({
  color: 0x88aacc, transparent: true, opacity: 0.0, depthWrite: false
});
const matGroupIII = new THREE.MeshBasicMaterial({
  color: 0x4a8aff, transparent: true, opacity: 0.85, depthWrite: false
});
const matGroupV   = new THREE.MeshBasicMaterial({
  color: 0x4aff8a, transparent: true, opacity: 0.85, depthWrite: false
});

/* ═══════════════════════════════════════════════════════════════
   GEOMETRY CONSTANTS
   ═══════════════════════════════════════════════════════════════ */
const CH_BOTTOM_Y = 0.55;
const CH_WALL_TOP_Y = 2.20;
const CH_DOME_TOP_Y = 2.50;
const CH_DOME_TOP_R = 0.42;
const CH_RADIUS = 0.95;

const SHOWER_FACE_Y = 1.85;
const SHOWER_TOP_Y = 2.15;
const SHOWER_RADIUS = 0.88;

const SUSCEPTOR_Y = 1.55;

const LOAD_LOCK_X = -1.65;
const LOAD_LOCK_Y = 1.62;
const LOAD_LOCK_Z = 0;
const LOAD_LOCK_L = 1.05;
const LOAD_LOCK_R = 0.42;

/* ═══════════════════════════════════════════════════════════════
   FLOOR + FRAME
   ═══════════════════════════════════════════════════════════════ */
// Ground and grid belong to the shared Foundry room.
const frameGroup = new THREE.Group();
group.add(frameGroup);
const railMain = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.15, 0.30), matFrameRail);
railMain.position.set(0.3, 0.075, 0);
railMain.castShadow = true; railMain.receiveShadow = true;
frameGroup.add(railMain);
for (let x = -2.8; x <= 3.2; x += 0.9) {
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 1.9), matFrame);
  cross.position.set(x, 0.05, -0.15);
  cross.castShadow = true;
  frameGroup.add(cross);
}
for (let x = -3.0; x <= 3.2; x += 1.2) {
  for (let z = -1.1; z <= 1.1; z += 2.2) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.10, 12), matFrame);
    foot.position.set(x, 0.05, z);
    foot.castShadow = true;
    frameGroup.add(foot);
  }
}

/* ═══════════════════════════════════════════════════════════════
   MAIN CHAMBER
   ═══════════════════════════════════════════════════════════════ */
const chamberGroup = new THREE.Group();
group.add(chamberGroup);

const chamberWall = new THREE.Mesh(
  new THREE.CylinderGeometry(CH_RADIUS, CH_RADIUS, CH_WALL_TOP_Y - CH_BOTTOM_Y, 64, 1, true),
  matSteelWall
);
chamberWall.material.side = THREE.DoubleSide;
chamberWall.position.y = (CH_BOTTOM_Y + CH_WALL_TOP_Y) / 2;
chamberWall.castShadow = true; chamberWall.receiveShadow = true;
chamberGroup.add(chamberWall);

const jacketPts = [];
const jBot = 0.65, jTop = 2.10;
const jTurns = 12;
for (let i = 0; i <= 240; i++) {
  const frac = i / 240;
  const a = frac * jTurns * Math.PI * 2;
  const y = jBot + (jTop - jBot) * frac;
  jacketPts.push(new THREE.Vector3(
    Math.cos(a) * (CH_RADIUS + 0.055),
    y,
    Math.sin(a) * (CH_RADIUS + 0.055)
  ));
}
const jacketCurve = new THREE.CatmullRomCurve3(jacketPts);
const jacketTube = new THREE.Mesh(
  new THREE.TubeGeometry(jacketCurve, 240, 0.024, 6, false),
  matWaterJacket
);
jacketTube.castShadow = true;
chamberGroup.add(jacketTube);

const bottomFlange = new THREE.Mesh(
  new THREE.CylinderGeometry(CH_RADIUS + 0.14, CH_RADIUS + 0.14, 0.11, 64),
  matSteelRim
);
bottomFlange.position.y = CH_BOTTOM_Y - 0.055;
bottomFlange.castShadow = true; bottomFlange.receiveShadow = true;
chamberGroup.add(bottomFlange);

const topWallFlange = new THREE.Mesh(
  new THREE.CylinderGeometry(CH_RADIUS + 0.14, CH_RADIUS + 0.14, 0.11, 64),
  matSteelRim
);
topWallFlange.position.y = CH_WALL_TOP_Y + 0.055;
topWallFlange.castShadow = true; topWallFlange.receiveShadow = true;
chamberGroup.add(topWallFlange);

const domeHeight = CH_DOME_TOP_Y - CH_WALL_TOP_Y;
const dome = new THREE.Mesh(
  new THREE.CylinderGeometry(CH_DOME_TOP_R, CH_RADIUS, domeHeight, 64, 1, true),
  matSteelWall
);
dome.material.side = THREE.DoubleSide;
dome.position.y = CH_WALL_TOP_Y + domeHeight / 2;
dome.castShadow = true; dome.receiveShadow = true;
chamberGroup.add(dome);

const domeTopPlate = new THREE.Mesh(
  new THREE.CylinderGeometry(CH_DOME_TOP_R + 0.04, CH_DOME_TOP_R + 0.04, 0.05, 32),
  matSteelRim
);
domeTopPlate.position.y = CH_DOME_TOP_Y + 0.025;
domeTopPlate.castShadow = true;
chamberGroup.add(domeTopPlate);

for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2;
  const rib = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, CH_WALL_TOP_Y - CH_BOTTOM_Y - 0.15, 0.04),
    matSteelRim
  );
  rib.position.set(
    Math.cos(a) * (CH_RADIUS + 0.02),
    (CH_BOTTOM_Y + CH_WALL_TOP_Y) / 2,
    Math.sin(a) * (CH_RADIUS + 0.02)
  );
  rib.rotation.y = -a;
  rib.castShadow = true;
  chamberGroup.add(rib);
}

for (let i = 0; i < 16; i++) {
  const a = (i / 16) * Math.PI * 2;
  const bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.05, 8),
    matSteelRim
  );
  bolt.position.set(
    Math.cos(a) * (CH_RADIUS + 0.07),
    CH_BOTTOM_Y - 0.02,
    Math.sin(a) * (CH_RADIUS + 0.07)
  );
  chamberGroup.add(bolt);
}

// Internal bottom flange fittings (unclipped)
const tcFeedthrough = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.04, 0.10, 12),
  matCeramic
);
tcFeedthrough.position.set(0.20, CH_BOTTOM_Y - 0.10, -0.25);
chamberGroup.add(tcFeedthrough);

const purgeInlet = new THREE.Mesh(
  new THREE.CylinderGeometry(0.035, 0.035, 0.10, 12),
  matSteelExt
);
purgeInlet.position.set(-0.55, CH_BOTTOM_Y - 0.10, -0.10);
chamberGroup.add(purgeInlet);

// Viewports
const vpFrontHousing = new THREE.Mesh(
  new THREE.CylinderGeometry(0.16, 0.16, 0.10, 24),
  matSteelRim
);
vpFrontHousing.rotation.x = Math.PI / 2;
vpFrontHousing.position.set(0, 1.617, CH_RADIUS - 0.02);
chamberGroup.add(vpFrontHousing);
const vpFrontGlass = new THREE.Mesh(
  new THREE.CircleGeometry(0.14, 24),
  matViewport
);
vpFrontGlass.position.set(0, 1.617, CH_RADIUS + 0.05);
chamberGroup.add(vpFrontGlass);

const vpPyrHousing = new THREE.Mesh(
  new THREE.CylinderGeometry(0.10, 0.10, 0.10, 20),
  matSteelRim
);
vpPyrHousing.rotation.x = Math.PI / 2;
vpPyrHousing.rotation.z = -0.25;
vpPyrHousing.position.set(0.55, 1.75, CH_RADIUS - 0.05);
chamberGroup.add(vpPyrHousing);

const pyrometer = new THREE.Mesh(
  new THREE.BoxGeometry(0.16, 0.12, 0.20),
  matSteelDark
);
pyrometer.position.set(0.62, 1.75, CH_RADIUS + 0.12);
pyrometer.rotation.z = -0.25;
pyrometer.castShadow = true;
chamberGroup.add(pyrometer);

const baratronBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.09, 0.09, 0.14, 20),
  matBaratron
);
baratronBody.rotation.x = Math.PI / 2;
baratronBody.position.set(-0.55, 1.80, CH_RADIUS + 0.05);
chamberGroup.add(baratronBody);

const baratronHead = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16),
  matSteelExt
);
baratronHead.rotation.x = Math.PI / 2;
baratronHead.position.set(-0.55, 1.80, CH_RADIUS + 0.14);
chamberGroup.add(baratronHead);

/* ═══════════════════════════════════════════════════════════════
   SHOWERHEAD
   ═══════════════════════════════════════════════════════════════ */
const showerGroup = new THREE.Group();
chamberGroup.add(showerGroup);

const showerBody = new THREE.Mesh(
  new THREE.CylinderGeometry(SHOWER_RADIUS, SHOWER_RADIUS, SHOWER_TOP_Y - SHOWER_FACE_Y - 0.03, 48),
  matShowerBody
);
showerBody.position.y = (SHOWER_FACE_Y + SHOWER_TOP_Y) / 2 + 0.015;
showerBody.castShadow = true; showerBody.receiveShadow = true;
showerGroup.add(showerBody);

const showerJacket = new THREE.Mesh(
  new THREE.CylinderGeometry(SHOWER_RADIUS + 0.05, SHOWER_RADIUS + 0.05, SHOWER_TOP_Y - SHOWER_FACE_Y - 0.10, 48),
  matShowerJacket
);
showerJacket.position.y = (SHOWER_FACE_Y + SHOWER_TOP_Y) / 2 + 0.05;
showerGroup.add(showerJacket);

[-1, 1].forEach(s => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.65 * s, SHOWER_TOP_Y - 0.02, 0),
    new THREE.Vector3(0.72 * s, SHOWER_TOP_Y + 0.15, 0.10),
    new THREE.Vector3(0.55 * s, CH_DOME_TOP_Y + 0.10, 0.15),
    new THREE.Vector3(0.35 * s, CH_DOME_TOP_Y + 0.30, 0.10)
  ]);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 30, 0.028, 8, false),
    matCoolRing
  );
  chamberGroup.add(tube);
});

const showerFace = new THREE.Mesh(
  new THREE.CylinderGeometry(SHOWER_RADIUS - 0.02, SHOWER_RADIUS - 0.02, 0.03, 48),
  matShowerFace
);
showerFace.position.y = SHOWER_FACE_Y + 0.015;
showerFace.castShadow = true;
showerGroup.add(showerFace);

// Alternate III and V openings around each radius. This illustrates separated
// passages without incorrectly implying that III supplies only the center and V
// supplies only the wafer perimeter. No mixing / uniformity CFD is implied.
const holeRings=[{r:.18,n:8},{r:.38,n:16},{r:.58,n:24},{r:.76,n:32}];
const holeDummy=new THREE.Object3D();
const holeMeshes={
 holes:new THREE.InstancedMesh(new THREE.CircleGeometry(.009,8),
  new THREE.MeshBasicMaterial({color:0x080812,side:THREE.DoubleSide}),80),
 III:new THREE.InstancedMesh(new THREE.RingGeometry(.010,.013,8),
  new THREE.MeshBasicMaterial({color:0x4a8aff,side:THREE.DoubleSide}),40),
 V:new THREE.InstancedMesh(new THREE.RingGeometry(.010,.013,8),
  new THREE.MeshBasicMaterial({color:0x4aff8a,side:THREE.DoubleSide}),40)
};
let holeI=0,groupIII=0,groupV=0;
for(const ring of holeRings)for(let i=0;i<ring.n;i++){
 const a=i/ring.n*Math.PI*2,x=Math.cos(a)*ring.r,z=Math.sin(a)*ring.r;
 holeDummy.rotation.x=Math.PI/2;
 holeDummy.position.set(x,SHOWER_FACE_Y-.001,z);
 holeDummy.updateMatrix();
 holeMeshes.holes.setMatrixAt(holeI++,holeDummy.matrix);
 const which=i%2===0?'III':'V';
 holeDummy.position.y=SHOWER_FACE_Y-.0005;
 holeDummy.updateMatrix();
 holeMeshes[which].setMatrixAt(which==='III'?groupIII++:groupV++,holeDummy.matrix);
}
for(const mesh of Object.values(holeMeshes)){
 mesh.instanceMatrix.needsUpdate=true;
 showerGroup.add(mesh);
}

const giiiFeed = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.06, CH_DOME_TOP_Y - SHOWER_TOP_Y + 0.30, 16),
  matGroupIII
);
giiiFeed.position.y = (SHOWER_TOP_Y + CH_DOME_TOP_Y + 0.30) / 2;
giiiFeed.position.x = -0.15;
chamberGroup.add(giiiFeed);

const gvFeed = new THREE.Mesh(
  new THREE.CylinderGeometry(0.09, 0.09, CH_DOME_TOP_Y - SHOWER_TOP_Y + 0.30, 16),
  matGroupV
);
gvFeed.position.y = (SHOWER_TOP_Y + CH_DOME_TOP_Y + 0.30) / 2;
gvFeed.position.x = 0.20;
chamberGroup.add(gvFeed);

/* ═══════════════════════════════════════════════════════════════
   SUSCEPTOR + WAFERS
   ═══════════════════════════════════════════════════════════════ */
const susceptorGroup = new THREE.Group();
susceptorGroup.position.y = SUSCEPTOR_Y;
chamberGroup.add(susceptorGroup);

const susceptorDisc = new THREE.Mesh(
  new THREE.CylinderGeometry(0.78, 0.78, 0.09, 64),
  matGraphite
);
susceptorDisc.castShadow = true; susceptorDisc.receiveShadow = true;
susceptorGroup.add(susceptorDisc);

const susceptorRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.76, 0.018, 10, 64),
  matGraphiteRim
);
susceptorRing.rotation.x = Math.PI / 2;
susceptorRing.position.y = 0.050;
susceptorGroup.add(susceptorRing);

// A flush surface marking, not a protruding puck above the graphite.
const centerRecess = new THREE.Mesh(new THREE.CircleGeometry(0.10, 24), matPocket);
centerRecess.rotation.x = -Math.PI / 2;
centerRecess.position.y = 0.046;
susceptorGroup.add(centerRecess);

const susceptorShaft = new THREE.Mesh(
  new THREE.CylinderGeometry(0.10, 0.10, 0.42, 20),
  matSteelDark
);
susceptorShaft.position.y = -0.25;
susceptorShaft.castShadow = true;
susceptorGroup.add(susceptorShaft);

// The bearing is fixed to the vessel support: the rotating shaft is the
// moving part, not the stationary bearing housing.
const bearingHousing = new THREE.Mesh(
  new THREE.CylinderGeometry(0.18, 0.18, 0.10, 20), matSteelExt
);
bearingHousing.position.y = SUSCEPTOR_Y - 0.48;
chamberGroup.add(bearingHousing);

const WAFER_ORBIT = 0.42;
const WAFER_RADIUS = 0.20;
const waferPositions = [];
for (let i = 0; i < BATCH_SIZE; i++) {
  const angle = (i / BATCH_SIZE) * Math.PI * 2 - Math.PI / 2;
  waferPositions.push({ x: Math.cos(angle) * WAFER_ORBIT, z: Math.sin(angle) * WAFER_ORBIT });
}

const growLayerMeshes = [];
for (let i = 0; i < BATCH_SIZE; i++) {
  const pos = waferPositions[i];

  const pocket = new THREE.Mesh(
    new THREE.CircleGeometry(WAFER_RADIUS + 0.020, 32),
    matPocket
  );
  pocket.rotation.x = -Math.PI / 2;
  pocket.position.set(pos.x, 0.046, pos.z);
  susceptorGroup.add(pocket);

  const pocketShadow = new THREE.Mesh(
    new THREE.RingGeometry(WAFER_RADIUS + 0.002, WAFER_RADIUS + 0.014, 32),
    new THREE.MeshBasicMaterial({
      color: 0x000000, opacity: 0.45, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      side: THREE.DoubleSide
    })
  );
  pocketShadow.rotation.x = -Math.PI / 2;
  pocketShadow.position.set(pos.x, 0.048, pos.z); // 0.002 above pocket; not coplanar
  susceptorGroup.add(pocketShadow);

  const w = new THREE.Mesh(
    new THREE.CylinderGeometry(WAFER_RADIUS, WAFER_RADIUS, 0.014, 40),
    matWafer
  );
  w.position.set(pos.x, 0.052, pos.z); // wafer bottom y=0.045, touches susceptor top
  w.castShadow = true; w.receiveShadow = true;
  susceptorGroup.add(w);

  const g = new THREE.Mesh(
    new THREE.CylinderGeometry(WAFER_RADIUS * 0.97, WAFER_RADIUS * 0.97, 1, 40),
    matGrowLayer.clone()
  );
  g.position.set(pos.x, 0.059, pos.z);
  g.scale.set(1, 0.0001, 1);
  g.visible = false;
  susceptorGroup.add(g);
  growLayerMeshes.push(g);
}

/* ═══════════════════════════════════════════════════════════════
   RF COIL (rotated 90° so leads exit at -z, clear of exhaust)
   ═══════════════════════════════════════════════════════════════ */
const coilPts = [];
const coilTurns = 4;
const coilInnerR = 0.40;
const coilOuterR = 0.76;
const coilYBot = 1.35;
const coilYTop = 1.42;
for (let i = 0; i <= 200; i++) {
  const frac = i / 200;
  const a = frac * coilTurns * Math.PI * 2;
  const r = coilInnerR + (coilOuterR - coilInnerR) * frac;
  const y = coilYBot + (coilYTop - coilYBot) * frac;
  coilPts.push(new THREE.Vector3(
    -Math.sin(a) * r,
    y,
    -Math.cos(a) * r
  ));
}
const coilCurve = new THREE.CatmullRomCurve3(coilPts);
const rfCoil = new THREE.Mesh(
  new THREE.TubeGeometry(coilCurve, 200, 0.028, 8, false),
  matCopper
);
rfCoil.castShadow = true;
chamberGroup.add(rfCoil);

// Coil leads overlap a continuous vertical copper feedthrough through the flange.
// Ceramic sleeves are represented by annular collars, not solid conductor caps.
const coilLeadBottomY = CH_BOTTOM_Y - 0.01;
const coilInnerLeadLength = coilYBot - coilLeadBottomY;
const coilInnerLead = new THREE.Mesh(
  new THREE.CylinderGeometry(0.018, 0.018, coilInnerLeadLength, 8),
  matCopperDark
);
coilInnerLead.position.set(0, (coilYBot + coilLeadBottomY) / 2, -coilInnerR);
chamberGroup.add(coilInnerLead);

const coilOuterLeadLength = coilYTop - coilLeadBottomY;
const coilOuterLead = new THREE.Mesh(
  new THREE.CylinderGeometry(0.018, 0.018, coilOuterLeadLength, 8),
  matCopperDark
);
coilOuterLead.position.set(0, (coilYTop + coilLeadBottomY) / 2, -coilOuterR);
chamberGroup.add(coilOuterLead);

const rfFeedIn = new THREE.Mesh(
  new THREE.CylinderGeometry(0.032, 0.032, 0.32, 16),
  matCopper
);
rfFeedIn.position.set(0, CH_BOTTOM_Y - 0.12, -coilInnerR);
chamberGroup.add(rfFeedIn);

const rfFeedOut = new THREE.Mesh(
  new THREE.CylinderGeometry(0.032, 0.032, 0.32, 16),
  matCopper
);
rfFeedOut.position.set(0, CH_BOTTOM_Y - 0.12, -coilOuterR);
chamberGroup.add(rfFeedOut);

// Insulating collars surround (but do not cap) the copper. Solid-flange
// penetration remains a deliberately schematic construction, not vacuum CAD.
for (const z of [-coilInnerR, -coilOuterR]) {
  for (const y of [CH_BOTTOM_Y - 0.015, CH_BOTTOM_Y - 0.105]) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.018, 10, 24), matCeramic);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, y, z);
    chamberGroup.add(collar);
  }
}

/* ═══════════════════════════════════════════════════════════════
   EXHAUST + FORELINE TRAP + PUMP + SCRUBBER
   ═══════════════════════════════════════════════════════════════ */
const exhaustGroup = new THREE.Group();
group.add(exhaustGroup);

const exhaustFlangeRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.19, 0.012, 8, 32),
  matSteelExt
);
exhaustFlangeRing.rotation.x = Math.PI / 2;
exhaustFlangeRing.position.set(0.42, CH_BOTTOM_Y - 0.055, 0.05);
exhaustGroup.add(exhaustFlangeRing);

const exhaustPort = new THREE.Mesh(
  new THREE.CylinderGeometry(0.18, 0.18, 0.28, 24),
  matSteelExt
);
exhaustPort.position.set(0.42, CH_BOTTOM_Y - 0.19, 0.05);
exhaustGroup.add(exhaustPort);

const throttleValve = new THREE.Mesh(
  new THREE.BoxGeometry(0.32, 0.20, 0.32),
  matSteelExt
);
throttleValve.position.set(0.42, CH_BOTTOM_Y - 0.425, 0.05); // 0.005 axial overlap with exhaust port
exhaustGroup.add(throttleValve);

const throttleActuator = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.06, 0.16, 16),
  matActuator
);
throttleActuator.position.set(0.42, CH_BOTTOM_Y - 0.26, 0.05);
exhaustGroup.add(throttleActuator);

const actuatorCable = new THREE.Mesh(
  new THREE.CylinderGeometry(0.010, 0.010, 0.20, 6),
  matSteelDarkExt
);
actuatorCable.rotation.z = Math.PI / 2;
actuatorCable.position.set(0.60, CH_BOTTOM_Y - 0.26, 0.05);
exhaustGroup.add(actuatorCable);

// Keep all vacuum equipment above the y=0 floor plane.
const FORELINE_Y = 0.37;
const forelineTrap = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.15, 0.45, 24),
  matForeline
);
forelineTrap.rotation.z = Math.PI / 2;
forelineTrap.position.set(1.10, FORELINE_Y, 0.05);
forelineTrap.castShadow = true;
exhaustGroup.add(forelineTrap);

for (let i = 0; i < 6; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.012, 6, 24),
    matCoolRingExt
  );
  ring.rotation.y = Math.PI / 2;
  ring.position.set(0.88 + i * 0.09, FORELINE_Y, 0.05);
  exhaustGroup.add(ring);
}

const pipeToTrapCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.42, CH_BOTTOM_Y - 0.43, 0.05),
  new THREE.Vector3(0.65, 0.24, 0.05),
  new THREE.Vector3(0.88, FORELINE_Y, 0.05)
]);
exhaustGroup.add(new THREE.Mesh(
  new THREE.TubeGeometry(pipeToTrapCurve, 20, 0.12, 12, false),
  matSteelExt
));

const dryPump = new THREE.Mesh(
  new THREE.BoxGeometry(0.55, 0.40, 0.40),
  matPump
);
dryPump.position.set(1.85, FORELINE_Y, 0.05);
dryPump.castShadow = true;
exhaustGroup.add(dryPump);

const trapToPump = new THREE.Mesh(
  new THREE.CylinderGeometry(0.10, 0.10, 0.30, 16),
  matSteelExt
);
trapToPump.rotation.z = Math.PI / 2;
trapToPump.position.set(1.45, FORELINE_Y, 0.05);
exhaustGroup.add(trapToPump);

const scrubberGroup = new THREE.Group();
scrubberGroup.position.set(3.10, 0.70, -1.55); // avoid gas-cabinet footprint
group.add(scrubberGroup);

const scrubberBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.65, 1.25, 0.55),
  matScrubber
);
scrubberBody.castShadow = true; scrubberBody.receiveShadow = true;
scrubberGroup.add(scrubberBody);

for (let i = 0; i < 6; i++) {
  const grill = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.02, 0.01),
    matSteelDarkExt
  );
  grill.position.set(0, 0.40 - i * 0.14, 0.28);
  scrubberGroup.add(grill);
}

const scrubberStack = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.10, 0.40, 16),
  matScrubber
);
scrubberStack.position.set(0, 0.82, 0);
scrubberGroup.add(scrubberStack);

const scrubberPipeCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(2.10, FORELINE_Y, 0.05),
  new THREE.Vector3(2.40, CH_BOTTOM_Y - 0.30, -0.60),
  new THREE.Vector3(3.10, 1.10, -1.20),
  new THREE.Vector3(3.10, 1.20, -1.40)
]);
group.add(new THREE.Mesh(
  new THREE.TubeGeometry(scrubberPipeCurve, 40, 0.09, 12, false),
  matSteelExt
));

/* ═══════════════════════════════════════════════════════════════
   LOAD LOCK + CASSETTE + HANDLER
   ═══════════════════════════════════════════════════════════════ */
const loadLockGroup = new THREE.Group();
loadLockGroup.position.set(LOAD_LOCK_X, LOAD_LOCK_Y, LOAD_LOCK_Z);
group.add(loadLockGroup);

const loadLockBody = new THREE.Mesh(
  new THREE.CylinderGeometry(LOAD_LOCK_R, LOAD_LOCK_R, LOAD_LOCK_L, 32),
  matLoadLock
);
loadLockBody.rotation.z = Math.PI / 2;
loadLockBody.castShadow = true;
loadLockGroup.add(loadLockBody);

const llFlangeL = new THREE.Mesh(
  new THREE.TorusGeometry(LOAD_LOCK_R, 0.028, 10, 48),
  matSteelExt
);
llFlangeL.rotation.y = Math.PI / 2;
llFlangeL.position.x = -LOAD_LOCK_L / 2;
loadLockGroup.add(llFlangeL);

const llFlangeR = new THREE.Mesh(
  new THREE.TorusGeometry(LOAD_LOCK_R, 0.028, 10, 48),
  matSteelExt
);
llFlangeR.rotation.y = Math.PI / 2;
llFlangeR.position.x = LOAD_LOCK_L / 2;
loadLockGroup.add(llFlangeR);

// Cassette: frame only (contents schematic — real cassette would be
// dimensioned to hold 4" wafers; current frame is a schematic container)
const cassetteGroup = new THREE.Group();
cassetteGroup.position.set(-0.30, 0, 0);
loadLockGroup.add(cassetteGroup);

const cassetteWall1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.24), matCassette);
cassetteWall1.position.set(-0.10, 0, 0.14);
cassetteGroup.add(cassetteWall1);

const cassetteWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.24), matCassette);
cassetteWall2.position.set(-0.10, 0, -0.14);
cassetteGroup.add(cassetteWall2);

const cassetteWall3 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.24), matCassette);
cassetteWall3.position.set(0.10, 0, 0.14);
cassetteGroup.add(cassetteWall3);

const cassetteWall4 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.24), matCassette);
cassetteWall4.position.set(0.10, 0, -0.14);
cassetteGroup.add(cassetteWall4);

const cassetteBack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.02), matCassette);
cassetteBack.position.set(0, 0, -0.14);
cassetteGroup.add(cassetteBack);

// Handler blade
const handlerGroup = new THREE.Group();
loadLockGroup.add(handlerGroup);

const handlerTrack = new THREE.Mesh(
  new THREE.BoxGeometry(0.90, 0.04, 0.10),
  matSteelExt
);
handlerTrack.position.set(0.10, -0.20, 0);
handlerGroup.add(handlerTrack);

const handlerCarriage = new THREE.Mesh(
  new THREE.BoxGeometry(0.14, 0.10, 0.14),
  matSteelDarkExt
);
handlerCarriage.position.set(0.05, -0.13, 0);
handlerGroup.add(handlerCarriage);

const handlerBlade = new THREE.Mesh(
  new THREE.BoxGeometry(0.32, 0.010, 0.20),
  matSteelExt
);
handlerBlade.position.set(0.20, -0.032, 0);
handlerGroup.add(handlerBlade);

const forkL = new THREE.Mesh(
  new THREE.BoxGeometry(0.10, 0.008, 0.02),
  matSteelExt
);
forkL.position.set(0.40, -0.032, 0.06);
handlerGroup.add(forkL);

const forkR = new THREE.Mesh(
  new THREE.BoxGeometry(0.10, 0.008, 0.02),
  matSteelExt
);
forkR.position.set(0.40, -0.032, -0.06);
handlerGroup.add(forkR);

// Handler wafer: radius 0.20 (matches reactor wafers)
const handlerWafer = new THREE.Mesh(
  new THREE.CylinderGeometry(0.20, 0.20, 0.008, 32),
  matWafer
);
handlerWafer.position.set(0.18, -0.024, 0);
handlerGroup.add(handlerWafer);

const llSupport = new THREE.Mesh(
  new THREE.CylinderGeometry(0.10, 0.12, 1.20, 14),
  matLeg
);
llSupport.position.set(LOAD_LOCK_X, 0.60, LOAD_LOCK_Z);
llSupport.castShadow = true;
group.add(llSupport);

// Gate valve: slides down in Y when open (perpendicular to transfer)
const gateValve = new THREE.Mesh(
  new THREE.BoxGeometry(0.20, 0.42, 0.42),
  matSteelExt
);
gateValve.position.set(-CH_RADIUS - 0.18, LOAD_LOCK_Y, 0);
group.add(gateValve);

/* ═══════════════════════════════════════════════════════════════
   GAS CABINET
   ═══════════════════════════════════════════════════════════════ */
const gasCabinet = new THREE.Group();
gasCabinet.position.set(1.90, 0, -1.00); // clear of raised foreline pump
group.add(gasCabinet);

const gcBody = new THREE.Mesh(
  new THREE.BoxGeometry(1.00, 1.80, 0.70),
  matGasPanel
);
gcBody.position.y = 0.90;
gcBody.castShadow = true; gcBody.receiveShadow = true;
gasCabinet.add(gcBody);

const gcFront = new THREE.Mesh(
  new THREE.BoxGeometry(0.94, 1.72, 0.02),
  matMFCFace
);
gcFront.position.set(0, 0.90, 0.36);
gasCabinet.add(gcFront);

const mfcColors = [0xff7a2a, 0xc08aff, 0x7ee6a0, 0x7fc4ff];
for (let i = 0; i < 4; i++) {
  const y = 1.42 - i * 0.22;
  const mfc = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.08), matSteelExt);
  mfc.position.set(0, y, 0.38);
  gasCabinet.add(mfc);
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.50, 0.020, 0.005),
    new THREE.MeshBasicMaterial({ color: mfcColors[i] })
  );
  strip.position.set(0, y + 0.045, 0.425);
  gasCabinet.add(strip);
  const display = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.005), matMFCDisplay);
  display.position.set(0.16, y - 0.02, 0.425);
  gasCabinet.add(display);
}

const gcDivider = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.03, 0.02), matSteelExt);
gcDivider.position.set(0, 0.55, 0.36);
gasCabinet.add(gcDivider);

// Bubbler ID ring colors match MFC color-coding above. Bubbler 3 is a
// generic auxiliary metalorganic (e.g., TMAl for barrier layers); hydride
// sources AsH3 / PH3 are cylinder-fed (not bubbled) and are not shown.
const bubblerOffsets = [-0.28, 0, 0.28];
const bubblerColors = [0xff7a2a, 0xc08aff, 0x7ee6a0];
bubblerOffsets.forEach((x, i) => {
  const ampoule = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.28, 16), matBubbler);
  ampoule.position.set(x, 0.30, 0.42);
  ampoule.renderOrder = 3; // liquid is rendered before transparent vessel
  gasCabinet.add(ampoule);
  const heater = new THREE.Mesh(new THREE.CylinderGeometry(0.090, 0.090, 0.30, 16), matBubblerHeat);
  heater.position.set(x, 0.30, 0.42);
  heater.renderOrder = 4;
  gasCabinet.add(heater);
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.12, 16), matBubblerLiq);
  liquid.position.set(x, 0.25, 0.42);
  gasCabinet.add(liquid);
  const idRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.078, 0.006, 6, 20),
    new THREE.MeshBasicMaterial({ color: bubblerColors[i] })
  );
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(x, 0.42, 0.42);
  gasCabinet.add(idRing);
  const outlet = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.15, 8), matHeatedLine);
  outlet.position.set(x, 0.52, 0.42);
  gasCabinet.add(outlet);
});

const gcBase = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 0.75), matSteelExt);
gcBase.position.y = 0.04;
gasCabinet.add(gcBase);

[-0.42, 0.42].forEach(x => {
  [-0.28, 0.28].forEach(z => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 10), matLeg);
    foot.position.set(x, 0.03, z);
    gasCabinet.add(foot);
  });
});

/* ═══════════════════════════════════════════════════════════════
   MANIFOLD + HEATED GAS LINES
   ═══════════════════════════════════════════════════════════════ */
const manifoldGroup = new THREE.Group();
manifoldGroup.position.set(0, CH_DOME_TOP_Y + 0.15, 0);
group.add(manifoldGroup);

const manifoldBlock = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.16, 0.35), matSteelExt);
manifoldBlock.castShadow = true;
manifoldGroup.add(manifoldBlock);

[-0.18, 0.18].forEach(ox => {
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), matSteelDarkExt);
  handle.position.set(ox, 0.14, 0);
  manifoldGroup.add(handle);
  const id = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 8, 8),
    new THREE.MeshBasicMaterial({ color: ox < 0 ? 0x4a8aff : 0x4aff8a })
  );
  id.position.set(ox, 0.22, 0);
  manifoldGroup.add(id);
});

const manifoldFeedL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 16), matGroupIII);
manifoldFeedL.position.set(-0.15, -0.12, 0);
manifoldGroup.add(manifoldFeedL);

const manifoldFeedR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 16), matGroupV);
manifoldFeedR.position.set(0.20, -0.12, 0);
manifoldGroup.add(manifoldFeedR);

const gcTopY = 1.80;
const gcTopX = 1.90;
const gcTopZ = -1.00;

const lineIIICurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(gcTopX - 0.20, gcTopY, gcTopZ + 0.30),
  new THREE.Vector3(gcTopX - 0.40, gcTopY + 0.40, gcTopZ + 0.10),
  new THREE.Vector3(0.90, 2.60, -0.10),
  new THREE.Vector3(0.30, 2.75, 0.05),
  new THREE.Vector3(0.10, 2.72, 0.05),
  new THREE.Vector3(-0.15, CH_DOME_TOP_Y + 0.22, 0)
]);
const lineIII = new THREE.Mesh(new THREE.TubeGeometry(lineIIICurve, 50, 0.020, 8, false), matHeatedLine);
group.add(lineIII);

const lineIIIMesh = new THREE.Mesh(new THREE.TubeGeometry(lineIIICurve, 50, 0.028, 8, false), matLineMesh);
lineIIIMesh.renderOrder = 2; // glass-like braiding over solid heated conduit
group.add(lineIIIMesh);

const lineVCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(gcTopX + 0.20, gcTopY, gcTopZ + 0.30),
  new THREE.Vector3(gcTopX + 0.30, gcTopY + 0.35, gcTopZ + 0.05),
  new THREE.Vector3(0.70, 2.55, -0.15),
  new THREE.Vector3(0.40, 2.72, 0),
  new THREE.Vector3(0.22, CH_DOME_TOP_Y + 0.22, 0)
]);
const lineV = new THREE.Mesh(new THREE.TubeGeometry(lineVCurve, 50, 0.026, 8, false), matHeatedLine);
group.add(lineV);

const lineVMesh = new THREE.Mesh(new THREE.TubeGeometry(lineVCurve, 50, 0.034, 8, false), matLineMesh);
lineVMesh.renderOrder = 2;
group.add(lineVMesh);

/* ── STATUS LEDs ── */
const ledPositions = [
  [0, CH_DOME_TOP_Y + 0.08, 0.42],
  [-1.95, LOAD_LOCK_Y - 0.30, 0.42],
  [1.90, 1.62, -0.625],
  [1.90, 0.65, -0.625],
  [0.42, FORELINE_Y + 0.06, 0.30],
  [3.10, 1.55, -1.55]
];
ledPositions.forEach(([x, y, z]) => {
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), matLed);
  led.position.set(x, y, z);
  group.add(led);
});

/* ── GPU instancing: 80 moving particles require two draw calls ── */
const gasGeometry=new THREE.SphereGeometry(.009,6,4);
const particleDummy=new THREE.Object3D();
const gasStreams=['III','V'].map((species,i)=>{
 const mesh=new THREE.InstancedMesh(gasGeometry,
  new THREE.MeshBasicMaterial({color:i===0?0x4a8aff:0x4aff8a,
   transparent:true,opacity:.72,depthWrite:false}),40);
 mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 mesh.frustumCulled=false;mesh.visible=false;
 group.add(mesh);
 const data=Array.from({length:40},()=>{
  const r=.70*Math.sqrt(Math.random()),a=Math.random()*Math.PI*2;
  return {phase:Math.random(),x:r*Math.cos(a),z:r*Math.sin(a),speed:.6+Math.random()*.4};
 });
 return {species,mesh,data};
});

 // Batch eligible rigid detail without merging the animated wafer assembly.
 const staticStats={};
 for(const [key,root] of Object.entries({frame:frameGroup,shower:showerGroup,
  chamber:chamberGroup,exhaust:exhaustGroup,scrubber:scrubberGroup,
  gasCabinet,manifold:manifoldGroup,loadLock:loadLockGroup}))
  staticStats[key]=mergeStaticDrawCalls(root);
 let shadowCasters=0;
 group.traverse(o=>{if(!o.isMesh)return;
  const opaque=!o.material?.transparent&&!o.material?.isMeshBasicMaterial;
  o.castShadow=opaque&&shadowCasters++<12;o.receiveShadow=false;
 });
 let spin=0;
 function setCut(value){
  cutState.value=THREE.MathUtils.clamp(value,0,1);
  cutPlane.constant=1.15-1.20*cutState.value;
 }
 function setVisual(proc,dt=0){
  const {phase='idle',simTime=0,T_now=25,thickness=0,target_um=2.5,running=false}=proc;
  if(running&&phase!=='load'&&phase!=='unload'){
   spin+=Math.max(0,dt)*2*Math.PI;
   susceptorGroup.rotation.y=spin;
  }
  const f=THREE.MathUtils.clamp(thickness/Math.max(target_um,1e-8),0,1);
  const h=.045*f;
  for(const layer of growLayerMeshes){
   layer.visible=h>.0001;
   if(layer.visible){layer.scale.y=h;layer.position.y=.0592+h/2;}
  }
  const hot=THREE.MathUtils.clamp((T_now-400)/300,0,1);
  matGraphite.emissiveIntensity=hot*.25;
  matCopper.emissiveIntensity=.15+hot*.35;
  const smooth=v=>{const a=THREE.MathUtils.clamp(v,0,1);return a*a*(3-2*a);};
  let extend=0,gate=0;
  if(running&&phase==='load'){
   const t=simTime-1.2;
   extend=t<=0?0:t<.8?t/.8:t<1.6?1-(t-.8)/.8:0;
   gate=simTime<.8?0:simTime<1.2?smooth((simTime-.8)/.4):
    simTime<2.8?1:simTime<3.2?1-smooth((simTime-2.8)/.4):0;
  }else if(running&&phase==='unload'){
   const t=simTime-37;
   extend=t<.15?0:t<.9?(t-.15)/.75:t<1.65?1-(t-.9)/.75:0;
   gate=t<.05?0:t<.15?smooth((t-.05)/.1):
    t<1.65?1:t<1.95?1-smooth((t-1.65)/.30):0;
  }
  extend=THREE.MathUtils.clamp(extend,0,1);
  const x=.20+extend*1.03;
  handlerBlade.position.x=x;handlerCarriage.position.x=x-.15;
  forkL.position.x=x+.20;forkR.position.x=x+.20;
  handlerWafer.position.x=x-.02;
  handlerWafer.visible=running&&extend>.05&&extend<.70;
  gateValve.position.set(-CH_RADIUS-.18,LOAD_LOCK_Y-.42*gate,0);
  const showV=running&&(phase==='heat'||phase==='stabilize'||phase==='grow'||
    phase==='cool'&&simTime<34.8);
  const showIII=running&&phase==='grow';
  for(const stream of gasStreams){
   const show=stream.species==='III'?showIII:showV;
   stream.mesh.visible=show;
   if(!show)continue;
   const top=SHOWER_FACE_Y-.03,bot=SUSCEPTOR_Y+.109;
   stream.data.forEach((particle,i)=>{
    particle.phase+=Math.max(0,dt)*particle.speed;
    if(particle.phase>=1){
     particle.phase%=1;
     const r=.70*Math.sqrt(Math.random()),a=Math.random()*Math.PI*2;
     particle.x=r*Math.cos(a);particle.z=r*Math.sin(a);
    }
    particleDummy.position.set(particle.x,top-(top-bot)*particle.phase,particle.z);
    particleDummy.scale.setScalar(1-.35*particle.phase);
    particleDummy.updateMatrix();
    stream.mesh.setMatrixAt(i,particleDummy.matrix);
   });
   stream.mesh.instanceMatrix.needsUpdate=true;
  }
  const c=phase==='done'?0x7ee6a0:0x7fc4ff;
  matLed.color.setHex(c);matLed.emissive.setHex(c);
  matLed.emissiveIntensity=phase==='done'?.85:running?.8:.45;
 }
 setCut(.58);setVisual({});
 group.visible=false;
 return {group,setCut,setVisual,staticStats,
  geometry:{waferRadius:.20,waferOrbit:.42,sceneMmPerUnit:250,
   showerGapMm:250*(SHOWER_FACE_Y-SUSCEPTOR_Y-.059)}};
}
