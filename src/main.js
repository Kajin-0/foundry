import * as THREE from 'three';
import {createSceneContext} from './scene/context.js';
import {createGeometryHelpers} from './scene/helpers.js';
import {buildLpe} from './scene/lpe.js';
import {buildIonMill} from './scene/ion-mill.js';
import {createThermalProfile} from './ui/thermal-profile.js';
import {createCrossSection} from './ui/cross-section.js';
import {BINS,PARK_X,UNLOAD_X,WELL_OFFSETS,CONTACT_THR,ZONES,BASE_TOP,SUB_TOP,MELT_H,SLIDER_BOT} from './config/geometry.js';
import {CYCLE,CYCLE_TOTAL_ANIM,CYCLE_TOTAL_REAL,fmtMin} from './process/lpe-cycle.js';
import {IBE,ibeRate,millMin,P_BASE,P_WORK,IMM_CYCLE,IMM_TOTAL,IMM_MILL,IMM_XFER,fmtP,imRealMin,lerpLog,pumpCurve} from './process/ion-etch.js';

const {renderer,scene,camera,controls,clipPlane,clipPlaneIMM,MAT} = createSceneContext();
const {cyl,box,boltRing,tubeAlong,makeCoil,annularTube} = createGeometryHelpers(MAT);
const {machine,zoneCoils,zoneLights,growthLayers,growthLayersGroup,contactRing,meltBridge,melts,sliderGroup,subRing,substrate,growthLight,sliderGlow,bubbles,pidScreens,otcLed,inletWheel,meltMats,baseMeltEmissive} = buildLpe({scene,MAT,clipPlane,cyl,box,boltRing,tubeAlong,makeCoil,annularTube});
const {IMM,etchL,wafer,resist,MASK_TOP,RES_H,tiltG,beamCone,plasma,plasmaCore,sputters,chamberLight,neutMat,leafL,leafR,shutterMat,shutterY,BT,BB,stg,RW,FW,vpGlow} = buildIonMill({scene,MAT,cyl,box,annularTube,tubeAlong});
let currentActiveLayer = null;
let shutOpen = 0;
const XS = createCrossSection(IBE);
const {maybeUpdateProfile} = createThermalProfile();

/* ============ LABELS ============ */
const lpeLabel = document.createElement('div');
lpeLabel.className = 'label3d';
lpeLabel.textContent = 'LPE · FURNACE';
lpeLabel.style.color = '#ffaa66';
lpeLabel.style.borderColor = '#ffaa66';
document.body.appendChild(lpeLabel);

const immLabel = document.createElement('div');
immLabel.className = 'label3d';
immLabel.textContent = 'ION BEAM ETCH · HIGH VACUUM';
immLabel.style.color = '#7fc4ff';
immLabel.style.borderColor = '#7fc4ff';
immLabel.style.display = 'none';
document.body.appendChild(immLabel);

const _v3 = new THREE.Vector3();
function placeLabel(el, wx, wy, wz) {
  _v3.set(wx, wy, wz).project(camera);
  const sx = (_v3.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-_v3.y * 0.5 + 0.5) * window.innerHeight;
  el.style.transform = `translate(-50%, -100%) translate(${sx}px, ${sy}px)`;
  el.style.opacity = (_v3.z < 1) ? '1' : '0';
}

/* ============ SHADOWS ============ */
machine.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
machine.traverse(o => {
  if (o.isMesh && o.material && (o.material.transparent || o.material.isMeshBasicMaterial)) {
    o.castShadow = false; o.receiveShadow = false;
  }
});
growthLayersGroup.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
contactRing.castShadow = false; meltBridge.castShadow = false;
IMM.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
IMM.traverse(o => {
  if (o.isMesh && o.material && (o.material.transparent || o.material.isMeshBasicMaterial)) {
    o.castShadow = false; o.receiveShadow = false;
  }
});
vpGlow.castShadow = false;

/* ============ CUTAWAY ============ */
const cutSlider = document.getElementById('cut');
const cutSliderIMM = document.getElementById('cutIMM');
function applyCut() {
  clipPlane.constant = 1.90 - (cutSlider.value / 100) * 3.00;
}
function applyCutIMM() {
  clipPlaneIMM.constant = 2.50 - (cutSliderIMM.value / 100) * 4.00;
}
cutSlider.addEventListener('input', applyCut);
cutSliderIMM.addEventListener('input', applyCutIMM);
applyCut();
applyCutIMM();


