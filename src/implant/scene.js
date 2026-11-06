import * as THREE from 'three';
import {mergeStaticDrawCalls} from '../scene/merge-static.js';
// Retained high-detail implanter beamline, analyzer and wafer end-station.
// Static root only: no separate canvas, renderer, floor, light rig or RAF.
export const IMPLANT_BAY_X=94;
export function buildImplanter({scene}){
const group=new THREE.Group();group.name='Ion implanter · Si dopant';
group.position.x=IMPLANT_BAY_X;scene.add(group);
const cutState={value:.58};
const cutPlane=new THREE.Plane(new THREE.Vector3(0,0,-1),2-cutState.value*3.2);
function clippedMat(mat){mat.clippingPlanes=[cutPlane];mat.clipShadows=true;return mat}
const proc={tilt:7};
function std(color, metalness, roughness, extra={}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}
const matFrame         = clippedMat(std(0x1a2431, 0.70, 0.48));
const matFrameRail     = clippedMat(std(0x2a3648, 0.75, 0.40));
const matHousing       = clippedMat(std(0x2a3648, 0.72, 0.42));
const matHousingDark   = clippedMat(std(0x1a2431, 0.68, 0.48));
const matMagnetIron    = clippedMat(std(0x2e3e54, 0.82, 0.32));
const matMagnetYoke    = clippedMat(std(0x3a4a60, 0.88, 0.28));
const matPoleFace      = clippedMat(std(0x9aa8bc, 0.96, 0.14));
const matCoil          = clippedMat(std(0x8a3a20, 0.55, 0.45, { emissive: 0x6a1a00, emissiveIntensity: 0.4 }));
const matElectrode     = clippedMat(std(0x9aa8bc, 0.95, 0.18));
const matAccelBody     = clippedMat(std(0x1e2836, 0.78, 0.34));
const matChamber       = clippedMat(std(0x243040, 0.72, 0.38));
const matChamberRim    = clippedMat(std(0x4a5a70, 0.85, 0.26));
const matChamberDark   = clippedMat(std(0x1a2431, 0.68, 0.44));
const matWafer         = std(0x8899ab, 0.80, 0.26);
const matStage         = std(0x3a4659, 0.90, 0.28);
const matStageTilt     = std(0x4a5a70, 0.88, 0.30);
const matBeam          = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.0 });
const matPacket        = new THREE.MeshBasicMaterial({ color: 0xffd060 });
const matFloor         = new THREE.MeshStandardMaterial({ color: 0x0a1219, roughness: 0.92, metalness: 0.08 });
const matLeg           = clippedMat(std(0x1a2431, 0.68, 0.48));
const matCable         = clippedMat(std(0x1a1e24, 0.35, 0.75));
const matLed           = new THREE.MeshStandardMaterial({ color: 0x7fc4ff, emissive: 0x7fc4ff, emissiveIntensity: 0.5 });
const matViewport      = new THREE.MeshPhysicalMaterial({
  color: 0x4a7aa8, metalness: 0.0, roughness: 0.05,
  transparent: true, opacity: 0.32
});
const matSpot          = new THREE.MeshBasicMaterial({
  color: 0xffd060, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false
});
const matSpotHalo      = new THREE.MeshBasicMaterial({
  color: 0xffd060, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false
});
const matGateValve     = clippedMat(std(0x6a7a8a, 0.85, 0.28));
const matBellows       = clippedMat(std(0x3a4a60, 0.72, 0.55));
const matTurboPump     = clippedMat(std(0x4a5a70, 0.82, 0.35));
const matArcChamber    = clippedMat(std(0x4a4e52, 0.85, 0.38));
const matFilament      = new THREE.MeshStandardMaterial({
  color: 0xffcc66, emissive: 0xff6622, emissiveIntensity: 1.6,
  metalness: 0.9, roughness: 0.3
});
const matCeramic       = clippedMat(std(0xe8e0d0, 0.10, 0.62));
const matCoolingLine   = clippedMat(std(0x6a7a8a, 0.88, 0.30));
const matPlasma        = new THREE.MeshBasicMaterial({
  color: 0xb060ff, transparent: true, opacity: 0.0,
  depthWrite: false, blending: THREE.AdditiveBlending
});
const matCupMetal      = std(0x9aa8bc, 0.90, 0.22);
const matRackBody      = clippedMat(std(0x2a3648, 0.72, 0.44));
const matRackPanel     = clippedMat(std(0x1a2431, 0.68, 0.50));
const matNeutralDump   = clippedMat(std(0x3a3a3a, 0.75, 0.45));

const frameGroup = new THREE.Group();
group.add(frameGroup);
const railMain = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.15, 0.30), matFrameRail);
railMain.position.set(0.5, 0.075, 0);
railMain.castShadow = true; railMain.receiveShadow = true;
frameGroup.add(railMain);
const railFront = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 0.30), matFrameRail);
railFront.position.set(0.2, 0.075, 0.55);
railFront.castShadow = true; railFront.receiveShadow = true;
frameGroup.add(railFront);
const railBack = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 0.30), matFrameRail);
railBack.position.set(0.2, 0.075, -0.75);
railBack.castShadow = true; railBack.receiveShadow = true;
frameGroup.add(railBack);
for (let x = -2.5; x <= 3.0; x += 0.9) {
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 1.55), matFrame);
  cross.position.set(x, 0.05, -0.10);
  cross.castShadow = true;
  frameGroup.add(cross);
}
for (let x = -2.8; x <= 3.2; x += 1.2) {
  for (let z = -0.9; z <= 0.9; z += 1.8) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.10, 12), matFrame);
    foot.position.set(x, 0.05, z);
    foot.castShadow = true;
    frameGroup.add(foot);
  }
}

/* ── BEAM PATH ──────────────────────────────────────────────── */
const BEAM_Y = 1.20;
const beamPathPts = [
  new THREE.Vector3(-1.10, BEAM_Y, -2.20),
  new THREE.Vector3(-0.70, BEAM_Y, -1.60),
  new THREE.Vector3(-0.30, BEAM_Y, -0.90),
  new THREE.Vector3(-0.10, BEAM_Y, -0.60),
  new THREE.Vector3( 0.08, BEAM_Y, -0.18),
  new THREE.Vector3( 0.50, BEAM_Y,  0.00),
  new THREE.Vector3( 0.90, BEAM_Y,  0.00),
  new THREE.Vector3( 1.50, BEAM_Y,  0.00),
  new THREE.Vector3( 2.10, BEAM_Y,  0.00),
  new THREE.Vector3( 2.55, BEAM_Y,  0.00),
  new THREE.Vector3( 2.77, BEAM_Y,  0.00)
];
const beamCurve = new THREE.CatmullRomCurve3(beamPathPts);

/* ══════════════════════════════════════════════════════════════
   ION SOURCE + HV DECK
   ══════════════════════════════════════════════════════════════ */
const SRC_X = -1.32, SRC_Y = BEAM_Y, SRC_Z = -2.53;
const SRC_YAW = -0.985;

const sourceGroup = new THREE.Group();
sourceGroup.position.set(SRC_X, SRC_Y, SRC_Z);
sourceGroup.rotation.y = SRC_YAW;
group.add(sourceGroup);

const arcChamber = new THREE.Mesh(
  new THREE.BoxGeometry(0.42, 0.38, 0.38),
  matArcChamber
);
arcChamber.castShadow = true; arcChamber.receiveShadow = true;
sourceGroup.add(arcChamber);

const plasmaCore = new THREE.Mesh(
  new THREE.BoxGeometry(0.36, 0.32, 0.32),
  matPlasma
);
sourceGroup.add(plasmaCore);

/* Filament: axis parallel to slit (local z), per Freeman geometry. */
const filament = new THREE.Mesh(
  new THREE.CylinderGeometry(0.010, 0.010, 0.22, 8),
  matFilament
);
filament.rotation.x = Math.PI / 2;
filament.position.set(-0.14, 0.02, 0);
sourceGroup.add(filament);

for (let i = -1; i <= 1; i += 2) {
  const lead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6),
    matElectrode
  );
  lead.position.set(-0.14, 0.15, i * 0.11);
  sourceGroup.add(lead);
}

const reflector = new THREE.Mesh(
  new THREE.BoxGeometry(0.02, 0.24, 0.24),
  matElectrode
);
reflector.position.set(0.10, 0, 0);
sourceGroup.add(reflector);

const gasInletPort = new THREE.Mesh(
  new THREE.CylinderGeometry(0.028, 0.028, 0.12, 12),
  matHousingDark
);
gasInletPort.position.set(0.08, 0.26, 0.10);
sourceGroup.add(gasInletPort);

const gasFeedthrough = new THREE.Mesh(
  new THREE.CylinderGeometry(0.018, 0.018, 0.30, 10),
  matCable
);
gasFeedthrough.rotation.x = Math.PI / 2;
gasFeedthrough.position.set(-0.08, 0.26, 0.14);
sourceGroup.add(gasFeedthrough);

for (let i = 0; i < 4; i++) {
  const angle = (i / 4) * Math.PI * 2;
  const cool = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.013, 6, 24, Math.PI * 0.7),
    matCoolingLine
  );
  cool.rotation.x = Math.PI / 2;
  cool.rotation.z = angle;
  cool.position.set(-0.05, 0.19, 0);
  sourceGroup.add(cool);
}

const arcAperture = new THREE.Mesh(
  new THREE.BoxGeometry(0.02, 0.14, 0.14),
  matElectrode
);
arcAperture.position.set(0.22, 0, 0);
sourceGroup.add(arcAperture);

const extractElectrode = new THREE.Mesh(
  new THREE.BoxGeometry(0.02, 0.16, 0.16),
  matElectrode
);
extractElectrode.position.set(0.29, 0, 0);
sourceGroup.add(extractElectrode);

const groundElectrode = new THREE.Mesh(
  new THREE.BoxGeometry(0.02, 0.20, 0.20),
  matElectrode
);
groundElectrode.position.set(0.40, 0, 0);
sourceGroup.add(groundElectrode);

for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const ins = new THREE.Mesh(
    new THREE.CylinderGeometry(0.013, 0.013, 0.055, 8),
    matCeramic
  );
  ins.rotation.z = Math.PI / 2;
  ins.position.set(0.255, Math.cos(a) * 0.10, Math.sin(a) * 0.10);
  sourceGroup.add(ins);
}
for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const ins = new THREE.Mesh(
    new THREE.CylinderGeometry(0.013, 0.013, 0.055, 8),
    matCeramic
  );
  ins.rotation.z = Math.PI / 2;
  ins.position.set(0.345, Math.cos(a) * 0.11, Math.sin(a) * 0.11);
  sourceGroup.add(ins);
}

const hvInsulator = new THREE.Mesh(
  new THREE.CylinderGeometry(0.10, 0.12, 0.32, 16),
  matCeramic
);
hvInsulator.position.set(0, -0.35, 0);
hvInsulator.castShadow = true;
sourceGroup.add(hvInsulator);

const srcFlange = new THREE.Mesh(
  new THREE.CylinderGeometry(0.22, 0.22, 0.06, 20),
  matHousing
);
srcFlange.position.set(0, -0.54, 0);
srcFlange.castShadow = true;
sourceGroup.add(srcFlange);

const hvDeckGroup = new THREE.Group();
group.add(hvDeckGroup);

const srcSupport = new THREE.Mesh(
  new THREE.CylinderGeometry(0.10, 0.12, 0.53, 16),
  matLeg
);
srcSupport.position.set(SRC_X, 0.315, SRC_Z);
srcSupport.castShadow = true;
hvDeckGroup.add(srcSupport);

const hvPillarPositions = [
  [-0.44, -0.44], [ 0.44, -0.44],
  [ 0.44,  0.44], [-0.44,  0.44]
];
hvPillarPositions.forEach(([ox, oz]) => {
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.062, 0.53, 12),
    matCeramic
  );
  pillar.position.set(SRC_X + ox, 0.315, SRC_Z + oz);
  pillar.castShadow = true;
  hvDeckGroup.add(pillar);
  for (let r = 0; r < 3; r++) {
    const ridge = new THREE.Mesh(
      new THREE.TorusGeometry(0.057, 0.007, 6, 16),
      matCeramic
    );
    ridge.rotation.x = Math.PI / 2;
    ridge.position.set(SRC_X + ox, 0.16 + r * 0.13, SRC_Z + oz);
    hvDeckGroup.add(ridge);
  }
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.068, 0.025, 12),
    matElectrode
  );
  cap.position.set(SRC_X + ox, 0.592, SRC_Z + oz);
  hvDeckGroup.add(cap);
});

const hvPlatform = new THREE.Mesh(
  new THREE.BoxGeometry(1.10, 0.05, 1.10),
  matHousing
);
hvPlatform.position.set(SRC_X, 0.62, SRC_Z);
hvPlatform.castShadow = true;
hvPlatform.receiveShadow = true;
hvDeckGroup.add(hvPlatform);

const hvRim = new THREE.Mesh(
  new THREE.BoxGeometry(1.14, 0.008, 1.14),
  matElectrode
);
hvRim.position.set(SRC_X, 0.645, SRC_Z);
hvDeckGroup.add(hvRim);

/* ══════════════════════════════════════════════════════════════
   MASS ANALYZER
   ══════════════════════════════════════════════════════════════ */
const magCenter = new THREE.Vector3(0.5, BEAM_Y, -0.6);
const magnetGroup = new THREE.Group();
magnetGroup.position.copy(magCenter);
group.add(magnetGroup);

const poleTopGeom = new THREE.RingGeometry(0.40, 0.80, 40, 1, Math.PI, Math.PI / 2);
poleTopGeom.rotateX(-Math.PI / 2);
const poleTop = new THREE.Mesh(poleTopGeom, matPoleFace);
poleTop.position.y = 0.14;
poleTop.castShadow = true; poleTop.receiveShadow = true;
magnetGroup.add(poleTop);

const poleBotGeom = new THREE.RingGeometry(0.40, 0.80, 40, 1, Math.PI, Math.PI / 2);
poleBotGeom.rotateX(-Math.PI / 2);
const poleBot = new THREE.Mesh(poleBotGeom, matPoleFace);
poleBot.position.y = -0.14;
poleBot.castShadow = true; poleBot.receiveShadow = true;
magnetGroup.add(poleBot);

const topHousingGeom = new THREE.RingGeometry(0.36, 0.88, 40, 1, Math.PI, Math.PI / 2);
topHousingGeom.rotateX(-Math.PI / 2);
const topHousing = new THREE.Mesh(topHousingGeom, matMagnetIron);
topHousing.position.y = 0.31;
topHousing.castShadow = true;
magnetGroup.add(topHousing);

const botHousingGeom = new THREE.RingGeometry(0.36, 0.88, 40, 1, Math.PI, Math.PI / 2);
botHousingGeom.rotateX(-Math.PI / 2);
const botHousing = new THREE.Mesh(botHousingGeom, matMagnetIron);
botHousing.position.y = -0.31;
botHousing.castShadow = true;
magnetGroup.add(botHousing);

const yokeWallGeom = new THREE.CylinderGeometry(
  0.85, 0.85, 0.72, 48, 1, true, Math.PI * 1.5, Math.PI / 2
);
const yokeWall = new THREE.Mesh(yokeWallGeom, matMagnetYoke);
yokeWall.material.side = THREE.DoubleSide;
yokeWall.castShadow = true;
magnetGroup.add(yokeWall);

const yokeBackGeom = new THREE.RingGeometry(0.85, 1.10, 40, 1, Math.PI, Math.PI / 2);
yokeBackGeom.rotateX(-Math.PI / 2);
const yokeBack = new THREE.Mesh(yokeBackGeom, matMagnetIron);
yokeBack.castShadow = true;
magnetGroup.add(yokeBack);

for (let h = 0; h < 5; h++) {
  const yH = -0.24 + h * 0.12;
  for (let s = 0; s < 8; s++) {
    const angle = Math.PI * 1.5 + (s / 7) * Math.PI * 0.5;
    const coilR = 0.98;
    const cx = coilR * Math.sin(angle);
    const cz = coilR * Math.cos(angle);
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.045, 0.10),
      matCoil
    );
    seg.position.set(cx, yH, cz);
    seg.rotation.y = angle + Math.PI / 2;
    seg.castShadow = true;
    magnetGroup.add(seg);
  }
}

const magEntryPort = new THREE.Mesh(
  new THREE.CylinderGeometry(0.09, 0.09, 0.70, 20),
  matChamberRim
);
magEntryPort.rotation.z = Math.PI / 2;
magEntryPort.position.set(-0.85, 0, 0);
magnetGroup.add(magEntryPort);

const magEntryFlange = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.15, 0.04, 20),
  matChamberRim
);
magEntryFlange.rotation.z = Math.PI / 2;
magEntryFlange.position.set(-1.18, 0, 0);
magnetGroup.add(magEntryFlange);

const magExitPort = new THREE.Mesh(
  new THREE.CylinderGeometry(0.09, 0.09, 0.70, 20),
  matChamberRim
);
magExitPort.rotation.x = Math.PI / 2;
magExitPort.position.set(0, 0, 0.85);
magnetGroup.add(magExitPort);

const magExitFlange = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.15, 0.04, 20),
  matChamberRim
);
magExitFlange.rotation.x = Math.PI / 2;
magExitFlange.position.set(0, 0, 1.18);
magnetGroup.add(magExitFlange);

for (let i = 0; i < 2; i++) {
  const lx = i === 0 ? -0.25 : 0.30;
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 0.75, 14),
    matLeg
  );
  leg.position.set(0.5 + lx, 0.42, -0.6 + 0.30);
  leg.castShadow = true;
  group.add(leg);
}

/* ── NEUTRAL TRAP — placed where undeflected neutrals land.
   Source beam direction: (0.53, 0, 0.85) from (-1.10, 1.2, -2.20).
   Neutrals continue past magnet to hit roughly (1.05, 1.2, 1.40). */
const neutralTrap = new THREE.Mesh(
  new THREE.BoxGeometry(0.40, 0.45, 0.20),
  matNeutralDump
);
neutralTrap.position.set(1.05, BEAM_Y, 1.40);
neutralTrap.castShadow = true;
group.add(neutralTrap);

const neutralTrapCap = new THREE.Mesh(
  new THREE.BoxGeometry(0.42, 0.06, 0.22),
  matChamberRim
);
neutralTrapCap.position.set(1.05, BEAM_Y + 0.25, 1.40);
group.add(neutralTrapCap);

/* ── GATE VALVE ──────────────────────────────────────────────── */
const gateValve = new THREE.Mesh(
  new THREE.BoxGeometry(0.20, 0.24, 0.24),
  matGateValve
);
gateValve.position.set(0.62, BEAM_Y, 0);
gateValve.castShadow = true;
group.add(gateValve);

const valveWheel = new THREE.Mesh(
  new THREE.TorusGeometry(0.06, 0.015, 8, 20),
  matGateValve
);
valveWheel.position.set(0.62, BEAM_Y + 0.15, 0);
group.add(valveWheel);

/* ── RESOLVING APERTURE ──────────────────────────────────────── */
const apertureGroup = new THREE.Group();
apertureGroup.position.set(0.86, BEAM_Y, 0);
group.add(apertureGroup);
for (let s = -1; s <= 1; s += 2) {
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.28, 0.10),
    matElectrode
  );
  plate.position.set(0, 0, s * 0.055);
  plate.castShadow = true;
  apertureGroup.add(plate);
}
for (let s = -1; s <= 1; s += 2) {
  const standoff = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.04, 0.22),
    matCeramic
  );
  standoff.position.set(0, s * 0.155, 0);
  apertureGroup.add(standoff);
}

/* ── ACCELERATION COLUMN ────────────────────────────────────── */
const accelGroup = new THREE.Group();
accelGroup.position.set(1.10, BEAM_Y, 0);
const accelOuter = new THREE.Mesh(
  new THREE.CylinderGeometry(0.18, 0.18, 0.35, 24),
  matAccelBody
);
accelOuter.rotation.z = Math.PI / 2;
accelOuter.castShadow = true;
accelGroup.add(accelOuter);
for (let i = 0; i < 4; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.10, 0.010, 8, 24),
    matElectrode
  );
  ring.rotation.y = Math.PI / 2;
  ring.position.x = -0.13 + i * 0.09;
  accelGroup.add(ring);
}
group.add(accelGroup);
const accelSupport = new THREE.Mesh(
  new THREE.CylinderGeometry(0.07, 0.09, 0.78, 12),
  matLeg
);
accelSupport.position.set(1.10, 0.42, 0);
accelSupport.castShadow = true;
group.add(accelSupport);

/* ── SCANNER ────────────────────────────────────────────────── */
const scannerGroup = new THREE.Group();
scannerGroup.position.set(1.50, BEAM_Y, 0);
const scannerBox = new THREE.Mesh(
  new THREE.BoxGeometry(0.28, 0.30, 0.30),
  matHousing
);
scannerBox.castShadow = true;
scannerGroup.add(scannerBox);
for (let s = -1; s <= 1; s += 2) {
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.20, 0.20),
    matElectrode
  );
  plate.position.set(0, s * 0.08, 0);
  scannerGroup.add(plate);
}
group.add(scannerGroup);
const scannerSupport = new THREE.Mesh(
  new THREE.CylinderGeometry(0.07, 0.09, 0.78, 12),
  matLeg
);
scannerSupport.position.set(1.50, 0.42, 0);
scannerSupport.castShadow = true;
group.add(scannerSupport);

/* ── BELLOWS ────────────────────────────────────────────────── */
const bellowsGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.20, 16, 4);
const bellows = new THREE.Mesh(bellowsGeom, matBellows);
bellows.rotation.z = Math.PI / 2;
bellows.position.set(1.78, BEAM_Y, 0);
bellows.castShadow = true;
group.add(bellows);
for (let i = 0; i < 4; i++) {
  const ridge = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.008, 6, 16),
    matBellows
  );
  ridge.rotation.y = Math.PI / 2;
  ridge.position.set(1.78 + (i - 1.5) * 0.045, BEAM_Y, 0);
  group.add(ridge);
}

/* ── BEAMLINE TURBO PUMPS ───────────────────────────────────── */
function addBeamlinePump(xPos, zPos, scale) {
  const grp = new THREE.Group();
  grp.position.set(xPos, 0, zPos);
  group.add(grp);
  const s = scale || 1.0;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15 * s, 0.13 * s, 0.36 * s, 16),
    matTurboPump
  );
  body.position.y = 0.34;
  body.castShadow = true;
  grp.add(body);
  const flange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17 * s, 0.17 * s, 0.04, 20),
    matChamberRim
  );
  flange.position.y = 0.54;
  grp.add(flange);
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045 * s, 0.045 * s, 0.64, 12),
    matChamberRim
  );
  pipe.position.y = 0.88;
  grp.add(pipe);
  for (let i = 0; i < 2; i++) {
    const fin = new THREE.Mesh(
      new THREE.TorusGeometry(0.16 * s, 0.011, 6, 20),
      matTurboPump
    );
    fin.rotation.x = Math.PI / 2;
    fin.position.y = 0.25 + i * 0.14;
    grp.add(fin);
  }
  return grp;
}
addBeamlinePump(0.90, 0, 1.0);
addBeamlinePump(1.30, 0, 0.90);

/* ── END-STATION CHAMBER ────────────────────────────────────── */
const chamberGroup = new THREE.Group();
chamberGroup.position.set(2.55, BEAM_Y, 0);
group.add(chamberGroup);

const chamberBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.75, 0.75, 1.10, 40),
  matChamber
);
chamberBody.rotation.z = Math.PI / 2;
chamberBody.castShadow = true; chamberBody.receiveShadow = true;
chamberGroup.add(chamberBody);

[-0.55, 0.55].forEach(xOff => {
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.028, 12, 64),
    matChamberRim
  );
  rim.rotation.y = Math.PI / 2;
  rim.position.x = xOff;
  chamberGroup.add(rim);
});

const frontFlange = new THREE.Mesh(
  new THREE.CylinderGeometry(0.85, 0.85, 0.06, 40),
  matChamberRim
);
frontFlange.rotation.z = Math.PI / 2;
frontFlange.position.x = 0.55;
chamberGroup.add(frontFlange);

const viewportHousing = new THREE.Mesh(
  new THREE.CylinderGeometry(0.20, 0.20, 0.06, 24),
  matChamberRim
);
viewportHousing.rotation.z = Math.PI / 2;
viewportHousing.rotation.y = 0.35;
viewportHousing.position.set(0.05, 0.72, 0.30);
chamberGroup.add(viewportHousing);

const viewportGlass = new THREE.Mesh(
  new THREE.CircleGeometry(0.17, 24),
  matViewport
);
viewportGlass.rotation.y = Math.PI / 2;
viewportGlass.rotation.x = -Math.PI / 2;
viewportGlass.position.set(0.05, 0.76, 0.30);
chamberGroup.add(viewportGlass);

const viewportHousing2 = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.15, 0.05, 20),
  matChamberRim
);
viewportHousing2.rotation.z = Math.PI / 2;
viewportHousing2.rotation.y = -0.5;
viewportHousing2.position.set(0.10, 0.45, -0.65);
chamberGroup.add(viewportHousing2);

const viewportGlass2 = new THREE.Mesh(
  new THREE.CircleGeometry(0.12, 20),
  matViewport
);
viewportGlass2.position.set(0.10, 0.45, -0.68);
chamberGroup.add(viewportGlass2);

const turboPort = new THREE.Mesh(
  new THREE.CylinderGeometry(0.22, 0.22, 0.25, 24),
  matChamberDark
);
turboPort.position.set(-0.1, -0.75, 0);
chamberGroup.add(turboPort);

const turboPump = new THREE.Mesh(
  new THREE.CylinderGeometry(0.20, 0.16, 0.35, 24),
  matTurboPump
);
turboPump.position.set(-0.1, -1.05, 0);
turboPump.castShadow = true;
chamberGroup.add(turboPump);

for (let i = 0; i < 3; i++) {
  const fin = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.018, 6, 24),
    matTurboPump
  );
  fin.rotation.x = Math.PI / 2;
  fin.position.set(-0.1, -0.98 - i * 0.10, 0);
  chamberGroup.add(fin);
}

const loadLock = new THREE.Mesh(
  new THREE.CylinderGeometry(0.30, 0.30, 0.55, 24),
  matChamber
);
loadLock.rotation.x = Math.PI / 2;
loadLock.position.set(0.15, 0, 0.85);
loadLock.castShadow = true;
chamberGroup.add(loadLock);

const loadLockFlange = new THREE.Mesh(
  new THREE.TorusGeometry(0.30, 0.025, 8, 32),
  matChamberRim
);
loadLockFlange.rotation.x = Math.PI / 2;
loadLockFlange.position.set(0.15, 0, 1.10);
chamberGroup.add(loadLockFlange);

const chamberBeamPort = new THREE.Mesh(
  new THREE.CylinderGeometry(0.10, 0.10, 0.25, 20),
  matChamberRim
);
chamberBeamPort.rotation.z = Math.PI / 2;
chamberBeamPort.position.set(-0.70, 0, 0);
chamberGroup.add(chamberBeamPort);

for (let zOff = -0.4; zOff <= 0.4; zOff += 0.8) {
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.12, 0.85, 14),
    matLeg
  );
  leg.position.set(2.45, 0.45, zOff);
  leg.castShadow = true;
  group.add(leg);
}

/* ── DOSIMETRY RING ──────────────────────────────────────────── */
const dosimetryGroup = new THREE.Group();
dosimetryGroup.position.set(2.32, BEAM_Y, 0);
group.add(dosimetryGroup);
const cupRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.13, 0.018, 10, 32),
  matCupMetal
);
cupRing.rotation.y = Math.PI / 2;
dosimetryGroup.add(cupRing);
const cupArm = new THREE.Mesh(
  new THREE.CylinderGeometry(0.018, 0.018, 0.70, 8),
  matCupMetal
);
cupArm.position.set(0, 0.38, 0);
dosimetryGroup.add(cupArm);

/* ── WAFER STAGE ─────────────────────────────────────────────── */
const stageGroup = new THREE.Group();
stageGroup.position.set(2.77, BEAM_Y, 0);
stageGroup.rotation.z = proc.tilt * Math.PI / 180;
group.add(stageGroup);

const platen = new THREE.Mesh(
  new THREE.CylinderGeometry(0.34, 0.34, 0.05, 40),
  matStage
);
platen.rotation.z = Math.PI / 2;
platen.position.x = 0.05;
platen.castShadow = true; platen.receiveShadow = true;
stageGroup.add(platen);

const tiltRod = new THREE.Mesh(
  new THREE.CylinderGeometry(0.03, 0.03, 0.40, 12),
  matStageTilt
);
tiltRod.rotation.z = Math.PI / 2;
tiltRod.position.set(0.25, 0, 0);
stageGroup.add(tiltRod);

const waferMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.30, 0.30, 0.014, 64),
  matWafer
);
waferMesh.rotation.z = Math.PI / 2;
waferMesh.position.x = 0;
waferMesh.castShadow = true; waferMesh.receiveShadow = true;
stageGroup.add(waferMesh);

const notchAngle = Math.PI * 0.25;
const notch = new THREE.Mesh(
  new THREE.CircleGeometry(0.008, 12),
  std(0x1a2431, 0.5, 0.6)
);
notch.position.set(-0.008, 0.28 * Math.cos(notchAngle), 0.28 * Math.sin(notchAngle));
notch.rotation.y = Math.PI / 2;
stageGroup.add(notch);

const spot = new THREE.Mesh(new THREE.CircleGeometry(0.055, 24), matSpot);
spot.rotation.y = Math.PI / 2;
spot.position.x = -0.010;
stageGroup.add(spot);

const spotHalo = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), matSpotHalo);
spotHalo.rotation.y = Math.PI / 2;
spotHalo.position.x = -0.009;
stageGroup.add(spotHalo);

/* ── CONTROL RACK ───────────────────────────────────────────── */
const rackGroup = new THREE.Group();
rackGroup.position.set(4.0, 0.72, 0.5);
group.add(rackGroup);
const rackBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.55, 1.35, 0.55),
  matRackBody
);
rackBody.castShadow = true;
rackBody.receiveShadow = true;
rackGroup.add(rackBody);
const rackPanel = new THREE.Mesh(
  new THREE.BoxGeometry(0.50, 1.25, 0.03),
  matRackPanel
);
rackPanel.position.set(0, 0, 0.28);
rackGroup.add(rackPanel);
for (let i = 0; i < 5; i++) {
  const ledBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.015, 0.008),
    new THREE.MeshBasicMaterial({ color: 0x7ee6a0 })
  );
  ledBox.position.set(-0.16 + i * 0.08, 0.52, 0.30);
  rackGroup.add(ledBox);
}
const rackScreen = new THREE.Mesh(
  new THREE.BoxGeometry(0.28, 0.16, 0.008),
  new THREE.MeshBasicMaterial({ color: 0x0a1828 })
);
rackScreen.position.set(0, 0.32, 0.30);
rackGroup.add(rackScreen);

/* ── BEAM TUBE + PACKETS ─────────────────────────────────────── */
const beamTubeGeom = new THREE.TubeGeometry(beamCurve, 80, 0.012, 8, false);
const beamMesh = new THREE.Mesh(beamTubeGeom, matBeam);
group.add(beamMesh);

// Single instanced ion-packet draw instead of forty individual meshes.
const PACKET_COUNT=40;
const packetPool=new THREE.InstancedMesh(
 new THREE.SphereGeometry(0.018,8,6),matPacket,PACKET_COUNT);
packetPool.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
packetPool.frustumCulled=false;
group.add(packetPool);
const packetMatrix=new THREE.Object3D();
packetMatrix.scale.setScalar(0.0001);
for(let i=0;i<PACKET_COUNT;i++){packetMatrix.updateMatrix();packetPool.setMatrixAt(i,packetMatrix.matrix)}
packetPool.instanceMatrix.needsUpdate=true;
/* ── STATUS LEDS ────────────────────────────────────────────── */
const ledPositions = [
  [-1.28, 1.52, -2.46],
  [ 0.50, 1.75, -0.30],
  [ 1.10, 1.50, 0.10],
  [ 1.50, 1.50, 0.10],
  [ 2.55, 1.90, 0.20]
];
ledPositions.forEach(([x, y, z]) => {
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), matLed);
  led.position.set(x, y, z);
  group.add(led);
});

/* ── CABLE RUN ──────────────────────────────────────────────── */
const cableCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.30, 0.15, -2.30),
  new THREE.Vector3(-0.60, 0.13, -1.30),
  new THREE.Vector3( 0.30, 0.16, -0.40),
  new THREE.Vector3( 1.10, 0.16, -0.10),
  new THREE.Vector3( 1.90, 0.18, -0.15),
  new THREE.Vector3( 2.50, 0.20, -0.20)
]);
group.add(new THREE.Mesh(
  new THREE.TubeGeometry(cableCurve, 40, 0.020, 8, false),
  matCable
));


const staticStats=mergeStaticDrawCalls(group,{exclude:new Set([
 stageGroup,beamMesh,packetPool,sourceGroup,matLed
])});
let packetPhase=0,ledPulse=0;
const ionColor={As:0xff7a2a,B:0x7ee6a0,P:0xc08aff};
const siColor=new THREE.Color(0x8899ab);
const dopColor=new THREE.Color();
function setVisual(s,dt,time){
 const current=s.beamCurrent_uA||0,maxCurrent=Math.max(1,s.effectiveCurrent_uA||100);
 const frac=Math.min(1,current/maxCurrent),active=s.phase==='implant'&&frac>.1;
 const col=ionColor[s.ion]??ionColor.As;
 matBeam.color.setHex(col);matBeam.opacity=frac*.7;
 matPacket.color.setHex(col);matPlasma.color.setHex(col);
 stageGroup.rotation.z=(s.tilt||0)*Math.PI/180;
 packetPhase=(packetPhase+dt*.30)%1;
 for(let i=0;i<PACKET_COUNT;i++){
  const f=(i/PACKET_COUNT+packetPhase)%1;
  const pos=beamCurve.getPointAt(f);
  packetMatrix.position.copy(pos);
  packetMatrix.scale.setScalar(frac>.05?.5+frac*.5:.0001);
  packetMatrix.updateMatrix();packetPool.setMatrixAt(i,packetMatrix.matrix);
 }
 packetPool.instanceMatrix.needsUpdate=true;
 matSpot.color.setHex(col);matSpotHalo.color.setHex(col);
 matSpot.opacity=active?.6+Math.sin(time*10)*.2*frac:0;
 matSpotHalo.opacity=active?.2+Math.sin(time*6)*.08*frac:0;
 const cutOpen=Math.max(0,(cutState.value-.3)/.7);
 matPlasma.opacity=cutOpen*(.15+frac*.65);
 matFilament.emissiveIntensity=s.running?1.6+Math.sin(time*20)*.3:.4;
 const doseFrac=Math.max(0,Math.min(1,(s.dose||0)/Math.max(1,s.targetDose||1)));
 dopColor.setHex(col);
 matWafer.color.copy(siColor).lerp(dopColor,doseFrac*.2);
 matWafer.emissive.copy(dopColor);matWafer.emissiveIntensity=doseFrac*.12;
 ledPulse+=dt*4;
 matLed.emissiveIntensity=s.running?1.2+Math.sin(ledPulse)*.6:s.phase==='done'?1:.4;
 const lc=s.phase==='done'?0x7ee6a0:0x7fc4ff;
 matLed.color.setHex(lc);matLed.emissive.setHex(lc);
 matCoil.emissiveIntensity=s.running?.65+Math.sin(ledPulse*.7)*.2:.35;
 cutPlane.constant=2-cutState.value*3.2;
}
return {group,setVisual,setCut:value=>{cutState.value=Math.max(0,Math.min(1,value));cutPlane.constant=2-cutState.value*3.2},staticStats};
}
