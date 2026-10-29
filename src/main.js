import * as THREE from 'three';
import {createSceneContext} from './scene/context.js';
import {createGeometryHelpers} from './scene/helpers.js';
import {buildLpe} from './scene/lpe.js';
import {buildIonMill} from './scene/ion-mill.js';
import {buildRoom,BAYS} from './scene/room.js';
import {createThermalProfile} from './ui/thermal-profile.js';
import {createCrossSection} from './ui/cross-section.js';
import {BINS,PARK_X,UNLOAD_X,WELL_OFFSETS,CONTACT_THR,ZONES,BASE_TOP,SUB_TOP,MELT_H,SLIDER_BOT} from './config/geometry.js';
import {CYCLE,CYCLE_TOTAL_ANIM,CYCLE_TOTAL_REAL,fmtMin} from './process/lpe-cycle.js';
import {IBE,ibeRate,millMin,P_BASE,P_WORK,IMM_CYCLE,IMM_TOTAL,IMM_MILL,IMM_XFER,fmtP,imRealMin,lerpLog,pumpCurve} from './process/ion-etch.js';

const {renderer,scene,camera,controls,clipPlane,clipPlaneIMM,MAT,keyLight,rimLPE,rimIMM,lowPower} = createSceneContext();
const {cyl,box,boltRing,tubeAlong,makeCoil,annularTube} = createGeometryHelpers(MAT);
const {machine,zoneCoils,zoneLights,growthLayers,growthLayersGroup,contactRing,meltBridge,melts,sliderGroup,subRing,substrate,growthLight,sliderGlow,bubbles,pidScreens,otcLed,inletWheel,meltMats,baseMeltEmissive} = buildLpe({scene,MAT,clipPlane,cyl,box,boltRing,tubeAlong,makeCoil,annularTube});
const {IMM,etchL,wafer,resist,MASK_TOP,RES_H,tiltG,beamCone,plasma,plasmaCore,sputters,chamberLight,neutMat,leafL,leafR,shutterMat,shutterY,BT,BB,stg,RW,FW,vpGlow} = buildIonMill({scene,MAT,cyl,box,annularTube,tubeAlong});
const room=buildRoom(scene);
let mbeController=null;
let mbeLoading=null;
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
const mbeLabel=document.createElement('div');
mbeLabel.className='label3d';
mbeLabel.textContent='MBE · UHV CHAMBER';
mbeLabel.style.color='#9dd4ff';
mbeLabel.style.borderColor='#7fc4ff';
document.body.appendChild(mbeLabel);

const _v3 = new THREE.Vector3();
function placeLabel(el, wx, wy, wz) {
  _v3.set(wx, wy, wz).project(camera);
  const sx = (_v3.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-_v3.y * 0.5 + 0.5) * window.innerHeight;
  el.style.transform = `translate(-50%, -100%) translate(${sx}px, ${sy}px)`;
  el.style.opacity = (_v3.z < 1) ? '1' : '0';
}

/* ============ SHADOWS ============ */
// Only large opaque structural members cast into the shared shadow atlas.
for(const group of [machine,IMM]){
 let casters=0;
 group.traverse(o=>{
  if(!o.isMesh)return;
  const opaque=!o.material?.transparent && !o.material?.isMeshBasicMaterial;
  o.castShadow=opaque && casters++<12;
  o.receiveShadow=false;
 });
}
vpGlow.castShadow=false;

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



/* ============ STATE ============ */
let cycleT = 0, cycleActive = false, cycleDone = false;
let currentPhaseIdx = -1, currentPhase = null, currentLocalT = 0;
let depositedLayers = 0, displayTemp = 25;
let sliderTargetX = PARK_X, prevContactMeltIdx = -1, subRingPulse = 0;

const S = {
  immT: 0, immOn: false, immDone: false,
  immIdx: -1, immLocal: 0,
  press: 5e-6, pLock: 760, wafer: 1, tiltNow: 0, beam: 0, stage: 25, etch: 0,
};

/* ============ DOM ============ */
const narrStatus = document.getElementById('narrStatus');
const narrDetail = document.getElementById('narrDetail');
const narrTime = document.getElementById('narrTime');
const progBarEl = document.getElementById('progBar');
const stackEl = document.getElementById('stack');
const playBtn = document.getElementById('playBtn');
const immBtn = document.getElementById('immBtn');
const tabLPE = document.getElementById('tabLPE');
const tabIMM = document.getElementById('tabIMM');
const lpeControlsEl = document.getElementById('lpeControls');
const immControlsEl = document.getElementById('immControls');

/* ============ LPE HELPERS ============ */
function activeLayerFraction() {
  if (!currentActiveLayer) return 0;
  const exp = (currentPhase && currentPhase.growthExp) || 1;
  return Math.max(0.001, Math.pow(currentLocalT, exp));
}

function updateZoneReadouts(mainTemp) {
  const t = Math.round(mainTemp);
  document.getElementById('t1').textContent = t + ' °C';
  document.getElementById('t2').textContent = t + ' °C';
  document.getElementById('t3').textContent = t + ' °C';
  document.getElementById('t4').textContent = t + ' °C';
}

function updateIdle() {
  displayTemp = 25;
  narrStatus.textContent = 'IDLE';
  narrStatus.style.color = '#5f7d9e';
  narrDetail.textContent = 'One virtual lab with three independent tools: LPE and MBE grow GaAs/AlGaAs layers; ion milling patterns a ridge using Ar⁺.';
  narrTime.textContent = `LPE · ${fmtMin(CYCLE_TOTAL_REAL)} simulated · ~${Math.round(CYCLE_TOTAL_ANIM)} s demo`;
  updateZoneReadouts(25);
  maybeUpdateProfile(25);
}

function resetStack() {
  stackEl.innerHTML = `<div class="layer sub"><span class="mat">GaAs (100) substrate</span><span class="thick">350 µm</span></div>`;
  depositedLayers = 0;
}

function resetGrowthLayers() {
  growthLayers.forEach(layer => {
    if (!layer) return;
    layer.deposited = false; layer.active = false;
    layer.mesh.visible = false; layer.mesh.scale.y = 0.0001;
    layer.material.emissiveIntensity = 0.12;
  });
  currentActiveLayer = null;
}

function depositLayer(idx) {
  if (idx <= depositedLayers) return;
  depositedLayers = idx;
  const b = BINS[idx];
  const div = document.createElement('div');
  div.className = 'layer new';
  div.innerHTML = `<span class="mat">${b.mat}</span><span class="thick">${b.thickness.toFixed(1)} µm</span>`;
  stackEl.appendChild(div);
}

/* ============ ONE SHARED ROOM · CAMERA / STATION SWITCH ============ */
let currentTab='overview';
const camPos={
 overview:{pos:new THREE.Vector3(14,17,46),tgt:new THREE.Vector3(14,3.25,0)},
 lpe:{pos:new THREE.Vector3(7.5,11,22),tgt:new THREE.Vector3(0,2.6,0)},
 imm:{pos:new THREE.Vector3(23,10,12),tgt:new THREE.Vector3(16,3.2,0)},
 mbe:{pos:new THREE.Vector3(37,9,13),tgt:new THREE.Vector3(30,4.25,0)}
};
let camGoal=null;
const tabEls={
 overview:document.getElementById('tabOverview'),
 lpe:document.getElementById('tabLPE'),
 imm:document.getElementById('tabIMM'),
 mbe:document.getElementById('tabMBE')
};
const leftLPE=document.getElementById('lpeLeft'),leftMBE=document.getElementById('mbeLeft');
const leftOverview=document.getElementById('overviewLeft');
const rightMBE=document.getElementById('mbeControls');
const rightOverview=document.getElementById('overviewControls');
const mbeButton=document.getElementById('mbePlayBtn');
async function ensureMBE(){
 if(mbeController)return mbeController;
 if(!mbeLoading){
  mbeLoading=Promise.all([import('./mbe/scene.js'),import('./mbe/controller.js')]).then(([sceneModule,controllerModule])=>{
   const plane=new THREE.Plane(new THREE.Vector3(0,0,-1),0);
   const model=sceneModule.buildMbe({scene,clipPlane:plane});
   mbeController=controllerModule.createMBEController(model);
   model.MBE.visible=currentTab==='mbe';
   room.setFocus(currentTab);
   mbeButton.disabled=false;
   mbeController.refresh();
   renderer.shadowMap.needsUpdate=true;
   return mbeController;
  }).catch(error=>{
    mbeLoading=null;
    mbeButton.disabled=true;
    document.getElementById('mbeNarrDetail').textContent='Unable to load the MBE model. Reload to retry.';
    console.error('MBE station failed to load:',error);
    throw error;
  });
 }
 return mbeLoading;
}
function showProcessPanel(tab){
 leftLPE.hidden=!(tab==='lpe'||tab==='imm');
 leftMBE.hidden=tab!=='mbe';
 leftOverview.hidden=tab!=='overview';
 lpeControlsEl.style.display=tab==='lpe'?'block':'none';
 immControlsEl.style.display=tab==='imm'?'block':'none';
 rightMBE.hidden=tab!=='mbe';
 rightOverview.hidden=tab!=='overview';
}
function switchTab(tab){
 if(!(tab in camPos))tab='overview';
 currentTab=tab;
 machine.visible=tab==='lpe';
 IMM.visible=tab==='imm';
 if(mbeController)mbeController.MBE.visible=tab==='mbe';
 room.setFocus(tab==='mbe'&&!mbeController?'overview':tab);
 for(const [id,button] of Object.entries(tabEls)){
   button.classList.toggle('active',id===tab);
   button.setAttribute('aria-pressed',String(id===tab));
 }
 showProcessPanel(tab);
 camGoal=camPos[tab];
 controls.maxPolarAngle=tab==='mbe'?Math.PI*.73:Math.PI*.495;
 // One physically shared key light; its shadow frustum follows the chosen station.
 const x=tab==='overview'?14:BAYS[tab].x;
 keyLight.position.set(x+9,18,14);
 keyLight.target.position.set(x,3,0);
 keyLight.target.updateMatrixWorld();
 rimLPE.visible=tab==='lpe';
 rimIMM.visible=tab==='imm';
 renderer.shadowMap.needsUpdate=true;
 lpeLabel.style.display=tab==='overview'||tab==='lpe'?'block':'none';
 immLabel.style.display=tab==='overview'||tab==='imm'?'block':'none';
 mbeLabel.style.display=tab==='overview'||tab==='mbe'?'block':'none';
 if(tab==='lpe'){
   if(currentPhase){narrStatus.textContent=currentPhase.narr;narrStatus.style.color=currentPhase.color;narrDetail.textContent=currentPhase.detail;}
   else updateIdle();
 }
 if(tab==='imm' && S.immOn && S.immIdx>=0){
   const phase=IMM_CYCLE[S.immIdx];
   narrStatus.textContent=phase.narr;narrStatus.style.color=phase.color;
   narrDetail.textContent=typeof phase.detail==='function'?phase.detail():phase.detail;
 }
 if(tab==='mbe'){
   if(!mbeController){
     mbeButton.disabled=true;
     document.getElementById('mbeNarrDetail').textContent='Opening the MBE station in the shared lab…';
     void ensureMBE();
   } else mbeController.refresh();
 }
}
for(const [id,button] of Object.entries(tabEls))button.addEventListener('click',()=>switchTab(id));

/* ============ BUTTONS ============ */
playBtn.addEventListener('click', () => {
  if (cycleActive) {
    cycleActive = false;
    playBtn.textContent = '▶ Run Growth Cycle';
    playBtn.classList.remove('running');
    return;
  }
  cycleT = 0; currentPhaseIdx = -1; currentPhase = null; currentLocalT = 0;
  cycleDone = false; cycleActive = true;
  resetStack(); resetGrowthLayers();
  if (!sliderGroup.position.x || Math.abs(sliderGroup.position.x - UNLOAD_X) < 0.01) {
    sliderGroup.position.x = PARK_X;
  }
  playBtn.textContent = '■ Stop Cycle';
  playBtn.classList.add('running');
  playBtn.classList.remove('done');
});

const tiltSl = document.getElementById('tiltIMM'), depthSl = document.getElementById('depthIMM');
tiltSl.addEventListener('input', () => { document.getElementById('tiltVal').textContent = tiltSl.value + '°'; });
depthSl.addEventListener('input', () => { document.getElementById('depthVal').textContent = (depthSl.value / 100).toFixed(2) + ' µm'; });
immBtn.addEventListener('click', () => {
  if (S.immOn) {
    S.immOn = false; S.beam = 0; S.tiltNow = 0; S.press = P_BASE; S.stage = 25;   /* abort: beam off, shutter closes, tilt home */
    tiltSl.disabled = depthSl.disabled = false;
    S.hold = { s: 'ABORTED · beam off', c: '#ff8a5a', d: 'Run stopped. Beam and Ar flow off, shutter closed, tilt returned to zero. The chip may be partly etched.', t: narrTime.textContent };
    immBtn.textContent = '▶ Run Ion Mill';
    immBtn.classList.remove('running');
    return;
  }
  S.immT = 0; S.immIdx = -1; S.immDone = false; S.immOn = true;
  S.etch = 0; S.press = P_BASE; S.pLock = 760; S.wafer = 0; S.tiltNow = 0; S.beam = 0; S.stage = 25;
  tiltSl.disabled = depthSl.disabled = true; S.hold = null;
  IBE.tilt = +tiltSl.value; IBE.depth = +depthSl.value / 100;
  etchL.forEach(l => { if (l) l.meshes.forEach(m => { m.visible = true; m.scale.y = 1; m.position.y = l.baseY + l.h / 2; }); });
  resist.scale.y = 1; resist.position.y = MASK_TOP + RES_H / 2; shutOpen = 0; XS.update(0, 1);
  immBtn.textContent = '■ Stop Mill';
  immBtn.classList.add('running');
  immBtn.classList.remove('done');
});

/* ============ INIT ============ */
updateIdle();
const initialTab=new URLSearchParams(window.location.search).get('tool');
switchTab(initialTab in camPos ? initialTab : 'overview');

/* ============ ANIMATION ============ */
const clock = new THREE.Clock();

function currentStackHeight() {
  let h = 0;
  growthLayers.forEach(l => {
    if (!l || !l.deposited) return;
    if (l.active) h += l.height * activeLayerFraction();
    else h += l.height;
  });
  return h;
}

function updateLPEState(dt, t) {
  zoneCoils.forEach((c, i) => {
    const glow = 0.3 + Math.max(0, (displayTemp - 25) / 800) * 3.0;
    c.material.emissiveIntensity = glow + Math.sin(t * 1.9 + i * 2.1) * 0.15;
  });
  zoneLights.forEach((l, i) => {
    const bright = 0.4 + Math.max(0, (displayTemp - 25) / 800) * 12;
    l.intensity = bright + Math.sin(t * 2.4 + i * 1.8) * 0.8;
  });

  melts.forEach((m, i) => {
    let supersat = 0;
    let underDim = 1.0;
    if (cycleActive && currentPhase) {
      if (currentPhase.deposit === i) supersat = currentLocalT * 0.5;
      if (currentPhase.meltback && i === 0) underDim = 0.6;
    }
    m.mesh.material.emissiveIntensity =
      (baseMeltEmissive[i] + supersat) * underDim + Math.sin(t * 3.4 + i * 1.3) * 0.06;
  });

  sliderGlow.intensity = cycleActive ? 3.4 : 1.8;
  inletWheel.rotation.z = t * 0.35;

  pidScreens.forEach((s, i) => {
    const ratio = Math.max(0, Math.min(1, (displayTemp - 25) / 780));
    s.pvStrip.material.emissiveIntensity = 0.3 + ratio * 2.2;
    s.svStrip.material.emissiveIntensity = 0.3 + ratio * 2.0;
  });

  bubbles.forEach(b => {
    const ph = (t * b.userData.speed + b.userData.phase) % 1;
    b.position.y = -0.19 + ph * 0.18;
    b.position.x = b.userData.baseX + Math.sin(ph * 20) * 0.006;
    b.scale.setScalar(0.5 + ph * 0.9);
  });

  let growthLightColor = null, growthLightIntensity = 0;

  if (cycleActive) {
    cycleT += dt;
    if (cycleT >= CYCLE_TOTAL_ANIM) {
      cycleT = CYCLE_TOTAL_ANIM;
      cycleActive = false; cycleDone = true;
      playBtn.textContent = '✓ LPE Complete';
      playBtn.classList.remove('running');
      playBtn.classList.add('done');
    }

    let acc = 0, idx = -1, localT = 0;
    for (let i = 0; i < CYCLE.length; i++) {
      if (cycleT < acc + CYCLE[i].animSec || i === CYCLE.length - 1) {
        idx = i; localT = Math.min(1, (cycleT - acc) / CYCLE[i].animSec); break;
      }
      acc += CYCLE[i].animSec;
    }
    currentLocalT = localT;

    if (idx !== currentPhaseIdx) {
      if (currentActiveLayer) {
        currentActiveLayer.mesh.scale.y = currentActiveLayer.height;
        currentActiveLayer.mesh.position.y = currentActiveLayer.baseY + currentActiveLayer.height / 2;
        currentActiveLayer.material.emissiveIntensity = 0.12;
        currentActiveLayer.active = false;
        currentActiveLayer = null;
      }
      currentPhaseIdx = idx;
      currentPhase = CYCLE[idx];
      if (currentPhase.deposit) {
        depositLayer(currentPhase.deposit);
        const layer = growthLayers[currentPhase.deposit];
        if (layer) {
          layer.deposited = true; layer.active = true; layer.mesh.visible = true;
          currentActiveLayer = layer;
        }
      }
      if (currentTab==='lpe') {
        narrStatus.textContent = currentPhase.narr;
        narrStatus.style.color = currentPhase.color;
        narrDetail.textContent = currentPhase.detail;
      }
    }

    const phase = currentPhase;
    if (phase.slider !== undefined) sliderTargetX = phase.slider;
    else if (phase.from !== undefined) sliderTargetX = phase.from + (phase.to - phase.from) * localT;

    const [tA, tB] = phase.temp;
    displayTemp = tA + (tB - tA) * localT;

    if (phase.deposit) { growthLightColor = 0x7fd6ff; growthLightIntensity = 1.4 + Math.sin(t * 8) * 0.4; }
    else if (phase.meltback) { growthLightColor = 0xff6030; growthLightIntensity = 1.6 + Math.sin(t * 9) * 0.5; }

    if (currentTab==='lpe') {
      progBarEl.style.width = (cycleT / CYCLE_TOTAL_ANIM * 100).toFixed(1) + '%';
      const elapsedReal = CYCLE.slice(0, idx).reduce((a, p) => a + p.realMin, 0) + localT * CYCLE[idx].realMin;
      narrTime.textContent = `${fmtMin(elapsedReal)} / ${fmtMin(CYCLE_TOTAL_REAL)} simulated · ${Math.round(CYCLE_TOTAL_ANIM)} s demo`;
    }
    updateZoneReadouts(displayTemp);
    maybeUpdateProfile(displayTemp);
  } else {
    sliderTargetX = cycleDone ? UNLOAD_X : PARK_X;
    if (cycleDone) {
      displayTemp = Math.max(25, displayTemp - 1.5);
      if (currentTab==='lpe') {
        narrStatus.textContent = 'LPE COMPLETE';
        narrStatus.style.color = '#7ee6a0';
        narrDetail.textContent = `${depositedLayers} layers · 2.1 µm total · DH structure finished. Switch to Ion Mill to pattern a ridge.`;
        narrTime.textContent = `${fmtMin(CYCLE_TOTAL_REAL)} simulated cycle · complete`;
      }
      updateZoneReadouts(displayTemp);
      maybeUpdateProfile(displayTemp);
    } else if (currentTab==='lpe') {
      updateIdle();
    }
  }

  sliderGroup.position.x += (sliderTargetX - sliderGroup.position.x) * 0.18;
  const sliderX = sliderGroup.position.x;

  const stackH = currentStackHeight();
  const stackTopY = SUB_TOP + stackH;
  const bridgeBottom = stackTopY + 0.001;
  const bridgeTop = SLIDER_BOT - 0.001;
  const bridgeHeight = Math.max(0.001, bridgeTop - bridgeBottom);

  let contactWellIdx = -1;
  let minDist = CONTACT_THR;
  melts.forEach((m, i) => {
    const wx = sliderX + WELL_OFFSETS[i];
    if (Math.abs(wx) < minDist) {
      minDist = Math.abs(wx);
      contactWellIdx = i;
    }
  });

  if (contactWellIdx >= 0) {
    const wx = sliderX + WELL_OFFSETS[contactWellIdx];
    meltBridge.visible = true;
    meltBridge.position.set(wx, (bridgeBottom + bridgeTop) / 2, 0);
    meltBridge.scale.y = bridgeHeight;
    meltBridge.material.color.setHex(BINS[contactWellIdx].color);
    meltBridge.material.emissive.copy(meltMats[contactWellIdx].emissive);
    meltBridge.material.emissiveIntensity = meltMats[contactWellIdx].emissiveIntensity;
  } else {
    meltBridge.visible = false;
  }

  contactRing.position.y = SUB_TOP + stackH + 0.002;

  if (contactWellIdx >= 0) {
    contactRing.material.color.setHex(BINS[contactWellIdx].color);
    contactRing.material.opacity = 0.35 + Math.sin(t * 6) * 0.12;
    if (prevContactMeltIdx !== contactWellIdx) subRingPulse = 1;
  } else {
    contactRing.material.color.setHex(0x7fd6ff);
    contactRing.material.opacity *= 0.85;
  }
  prevContactMeltIdx = contactWellIdx;
  subRingPulse *= 0.92;

  if (currentActiveLayer) {
    const vis = activeLayerFraction();
    currentActiveLayer.mesh.scale.y = currentActiveLayer.height * vis;
    currentActiveLayer.mesh.position.y = currentActiveLayer.baseY + (currentActiveLayer.height * vis) / 2;
    currentActiveLayer.material.emissiveIntensity = 0.5 + Math.sin(t * 7) * 0.25;
  }

  if (growthLightColor !== null) {
    growthLight.color.setHex(growthLightColor);
    growthLight.intensity = growthLightIntensity;
  } else {
    growthLight.intensity = 0;
  }

  const activity = growthLight.intensity > 0 ? 0.22 : 0.05;
  subRing.material.opacity = 0.28 + activity * Math.sin(t * 8) + subRingPulse * 0.5;
}

function updateIMMState(dt, t) {
  /* LPE's idle branch rewrites the narrator every frame while the mill is stopped; re-assert the mill's result */
  if (!S.immOn && S.hold && currentTab === 'imm' && !cycleActive) {
    narrStatus.textContent = S.hold.s; narrStatus.style.color = S.hold.c; narrDetail.textContent = S.hold.d; narrTime.textContent = S.hold.t;
  }
  if (S.immOn) {
    S.immT += dt;
    if (S.immT >= IMM_TOTAL) {
      S.immT = IMM_TOTAL;
      S.immOn = false; S.immDone = true;
      tiltSl.disabled = depthSl.disabled = false;
      S.hold = { s: 'MILL COMPLETE', c: '#7ee6a0', d: narrDetail.textContent, t: narrTime.textContent };
      immBtn.textContent = '✓ Mill Complete';
      immBtn.classList.remove('running');
      immBtn.classList.add('done');
    }

    let acc = 0, idx = -1, localT = 0;
    for (let i = 0; i < IMM_CYCLE.length; i++) {
      if (S.immT < acc + IMM_CYCLE[i].dur || i === IMM_CYCLE.length - 1) {
        idx = i; localT = Math.min(1, (S.immT - acc) / IMM_CYCLE[i].dur); break;
      }
      acc += IMM_CYCLE[i].dur;
    }
    S.immLocal = localT;

    if (idx !== S.immIdx) {
      S.immIdx = idx;
      const ph = IMM_CYCLE[idx];
      if(currentTab==='imm'){
        narrStatus.textContent = ph.narr;
        narrStatus.style.color = ph.color;
        narrDetail.textContent = typeof ph.detail === 'function' ? ph.detail() : ph.detail;
      }
    }

    const ph = IMM_CYCLE[idx];
    const prevIdx = idx - 1;
    const prev = prevIdx >= 0 ? IMM_CYCLE[prevIdx] : { tP: 760, tB: 0, tS: 25 };

    S.pLock = ph.pump ? pumpCurve(localT) : ph.lP ? lerpLog(ph.lP[0], ph.lP[1], localT) : S.pLock;
    S.press = ph.cP ? lerpLog(ph.cP[0], ph.cP[1], localT) : S.press;
    S.wafer = idx < IMM_XFER ? 0 : idx === IMM_XFER ? localT : 1;
    S.beam  = (prev.tB || 0) + (ph.tB - (prev.tB || 0)) * localT;
    S.stage = (prev.tS || 25) + (ph.tS - (prev.tS || 25)) * localT;

    S.etch = ph.etch ? localT : (idx > IMM_MILL ? 1 : 0);   /* tied to phase progress: no integration drift */
    S.elapsedReal = IMM_CYCLE.slice(0, idx).reduce((a, p, k) => a + imRealMin(k), 0) + localT * imRealMin(idx);
    S.tiltNow = ph.tilt ? IBE.tilt : ph.tiltOut ? IBE.tilt * (1 - localT) : 0;

    if(currentTab==='imm'){
      progBarEl.style.width=(S.immT/IMM_TOTAL*100).toFixed(1)+'%';
      narrTime.textContent=`IBE · ${fmtMin(S.elapsedReal)} of ${fmtMin(IMM_CYCLE.reduce((a,p,k)=>a+imRealMin(k),0))} real · demo ${Math.round(S.immT)}s / ${IMM_TOTAL}s`;
    }
  }

  /* readouts */
  document.getElementById('v1').textContent = fmtP(S.press);
  document.getElementById('v7').textContent = fmtP(S.pLock);
  document.getElementById('v2').textContent = S.beam.toFixed(2) + ' mA/cm²';
  document.getElementById('v3').textContent = Math.round(S.stage) + ' °C · ' + Math.round(THREE.MathUtils.radToDeg(tiltG.rotation.x)) + '° tilt';
  const dNow = S.etch * IBE.depth, rem = IBE.UPPER - dNow;
  document.getElementById('v4').textContent = S.etch > 0 ? Math.round(dNow * 1000) + ' nm @ ' + ibeRate(IBE.tilt).toFixed(0) + ' nm/min' : '—';
  const v5 = document.getElementById('v5');
  v5.textContent = S.etch > 0 ? (rem > 0 ? rem.toFixed(2) + ' µm' : 'ACTIVE HIT') : '—';
  v5.style.color = S.etch > 0 && rem < 0.05 ? '#ff6a5a' : '';
  document.getElementById('v6').textContent = S.etch > 0 ? Math.max(0, IBE.resistT - dNow / IBE.sel).toFixed(2) + ' µm' : '—';

  /* plasma visuals — additive blend gives the characteristic blue glow */
  MAT.plasma.opacity = S.beam * 1.2;
  MAT.plasmaCore.opacity = S.beam * 1.8;
  MAT.beam.opacity = S.beam * 0.8;
  MAT.vpGlow.opacity = S.beam * 0.85;
  plasma.scale.setScalar(1 + S.beam * 0.4);
  plasmaCore.scale.setScalar(1 + S.beam * 0.3);
  chamberLight.intensity = S.beam * 10;

  /* rotation averages beam non-uniformity and azimuthal shadowing of the tilted beam */
  tiltG.rotation.x = THREE.MathUtils.lerp(tiltG.rotation.x, (S.tiltNow || 0) * Math.PI / 180, 0.1);
  { const e = S.wafer, a = Math.min(1, e / 0.7), d = Math.max(0, (e - 0.7) / 0.3);   /* slide in from the lock, then lower onto the stage */
    wafer.position.set(2.2 * (1 - a), 0.06 + 0.24 * (1 - d), 0); }
  const hotNow = S.immOn && IMM_CYCLE[S.immIdx] && IMM_CYCLE[S.immIdx].hot, openNow = S.immOn && IMM_CYCLE[S.immIdx] && IMM_CYCLE[S.immIdx].open;
  shutOpen += ((openNow ? 1 : 0) - shutOpen) * Math.min(1, dt * 4);
  leafL.rotation.z = shutOpen * 1.5; leafR.rotation.z = -shutOpen * 1.5;
  const bBot = THREE.MathUtils.lerp(shutterY + 0.02, BB, shutOpen);
  beamCone.scale.y = Math.max(0.02, (BT - bBot) / (BT - BB)); beamCone.position.y = (BT + bBot) / 2;
  neutMat.emissiveIntensity += ((hotNow ? 2.2 : 0) - neutMat.emissiveIntensity) * Math.min(1, dt * 3);
  shutterMat.emissiveIntensity = S.beam * (1 - shutOpen) * 0.9;
  const isMilling = S.immOn && IMM_CYCLE[S.immIdx] && IMM_CYCLE[S.immIdx].etch;
  const spinRate = isMilling ? 1.5 : 0;   /* rad/s: 1.5 ≈ 14 rpm */
  wafer.rotation.y += spinRate * dt;
  stg.rotation.y = wafer.rotation.y;

  /* sputter particles as tapered directional streaks */
  let surfY = 0.04;                                   /* top of the topmost still-visible flank layer */
  for (let i = etchL.length - 1; i >= 1; i--) { const l = etchL[i]; if (l && l.meshes[0].visible) { surfY = l.baseY + l.h * l.meshes[0].scale.y; break; } }
  if (isMilling) wafer.updateWorldMatrix(true, false);   /* matrixWorld is otherwise one render stale */
  sputters.forEach(s => {
    if (isMilling) {
      s.mesh.visible = true;
      s.age += dt * 1.4;
      if (s.age >= 1) {
        s.age = 0;
        /* spawn on the etched FLANKS, in the wafer frame so it follows tilt + rotation */
        const side = Math.random() < 0.5 ? -1 : 1;
        const sp = new THREE.Vector3(side * (RW / 2 + Math.random() * FW * 0.9), surfY + 0.012, (Math.random() - 0.5) * 0.66);
        wafer.localToWorld(sp); IMM.worldToLocal(sp); s.mesh.position.copy(sp);
        s.nrm = new THREE.Vector3(0, 1, 0).transformDirection(wafer.matrixWorld);
        /* cosine forward-peaked distribution with occasional backscatter */
        const theta = Math.random() * Math.PI * 0.5;
        const phi = Math.random() * Math.PI * 2;
        const speed = 0.35 + Math.random() * 0.7;
        const jit = new THREE.Vector3(Math.sin(theta) * Math.cos(phi), 0, Math.sin(theta) * Math.sin(phi)).multiplyScalar(0.7);
        const vv = s.nrm.clone().multiplyScalar(Math.cos(theta)).add(jit).normalize().multiplyScalar(speed);
        s.vx = vv.x; s.vy = vv.y; s.vz = vv.z;
      }
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      /* orient the streak along its velocity */
      const v = new THREE.Vector3(s.vx, s.vy, s.vz).normalize();
      s.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
      s.mesh.material.opacity = 0.85 * (1 - s.age);
    } else {
      s.mesh.visible = false;
    }
  });

  /* etch both flanks top-down to the chosen depth; the ridge under the resist stays */
  let remaining = S.etch * IBE.depth;
  for (let i = etchL.length - 1; i >= 1; i--) {
    const l = etchL[i]; if (!l) continue;
    const take = Math.min(remaining, l.t), frac = take / l.t;
    const newH = Math.max(0.0005, l.h * (1 - frac));
    l.meshes.forEach(m => { m.visible = frac < 0.999; m.scale.y = newH / l.h; m.position.y = l.baseY + newH / 2; });
    remaining -= take;
  }
  /* resist is consumed at depth / selectivity (selectivity is an assumption) */
  const resLeft = Math.max(0.02, 1 - (S.etch * IBE.depth / IBE.sel) / IBE.resistT);
  resist.scale.y = resLeft; resist.position.y = MASK_TOP + RES_H * resLeft / 2;
  XS.update(S.etch * IBE.depth, resLeft);
}

// Geometry/simulation clocks are decoupled from view-specific DOM refreshes.
let lastFrameMs=-Infinity,lastInteractionMs=-Infinity,lastShadowMs=-Infinity;
const cpuRenderMs=[],presentIntervalsMs=[];
function recordSample(list,value){
 if(Number.isFinite(value)&&value>=0){list.push(value);if(list.length>90)list.shift();}
}
function p95(list){
 if(!list.length)return null;
 const sorted=[...list].sort((a,b)=>a-b);
 return Number(sorted[Math.floor((sorted.length-1)*.95)].toFixed(2));
}
let backgroundLpeDt=0,backgroundImmDt=0;
let lastZoneReadMs=-Infinity, lastImmReadMs=-Infinity;
for(const ev of ['pointerdown','pointermove','wheel']){
 renderer.domElement.addEventListener(ev,()=>{lastInteractionMs=performance.now();},{passive:true});
}
function animate(now=0){
 requestAnimationFrame(animate);
 if(document.hidden){clock.getDelta();return;}
 const focusActive=currentTab==='lpe'&&cycleActive||currentTab==='imm'&&S.immOn||currentTab==='mbe'&&mbeController?.isRunning();
 const moving=!!camGoal||now-lastInteractionMs<750;
 const targetFps=lowPower?(focusActive||moving?30:10):(focusActive||moving?45:12);
 if(now-lastFrameMs<1000/targetFps)return;
 if(Number.isFinite(lastFrameMs))recordSample(presentIntervalsMs,now-lastFrameMs);
 lastFrameMs=now;
 const dt=Math.min(clock.getDelta(),.22),t=clock.getElapsedTime();
 if(currentTab==='lpe'){
   updateLPEState(dt,t);backgroundLpeDt=0;
 }else if(cycleActive){
   backgroundLpeDt+=dt;
   if(backgroundLpeDt>=.10){updateLPEState(backgroundLpeDt,t);backgroundLpeDt=0;}
 }
 if(currentTab==='imm'){
   updateIMMState(dt,t);backgroundImmDt=0;
 }else if(S.immOn){
   backgroundImmDt+=dt;
   if(backgroundImmDt>=.10){updateIMMState(backgroundImmDt,t);backgroundImmDt=0;}
 }
 if(mbeController && (currentTab==='mbe'||mbeController.isRunning())){
   mbeController.update(dt,t,currentTab==='mbe');
 }
 if(camGoal){
   camera.position.lerp(camGoal.pos,.11);
   controls.target.lerp(camGoal.tgt,.11);
   if(camera.position.distanceTo(camGoal.pos)<.04&&controls.target.distanceTo(camGoal.tgt)<.04)camGoal=null;
 }
 if(lpeLabel.style.display!=='none')placeLabel(lpeLabel,0,6.5,0);
 if(immLabel.style.display!=='none')placeLabel(immLabel,16,7.5,0);
 if(mbeLabel.style.display!=='none')placeLabel(mbeLabel,30,8.2,0);
 controls.update();
 // Static shadow atlases are not regenerated on every camera frame.
 if(renderer.shadowMap.enabled&&(now-lastShadowMs>400)&&(focusActive||moving)){
   renderer.shadowMap.needsUpdate=true;lastShadowMs=now;
 }
 const renderStart=performance.now();
 renderer.render(scene,camera);
 recordSample(cpuRenderMs,performance.now()-renderStart);
}
window.addEventListener('resize',()=>{
 camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(window.innerWidth,window.innerHeight);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,lowPower?1:1.25));
 renderer.shadowMap.needsUpdate=true;
});
// Exposes lightweight, read-only render diagnostics for browser tests / profiling.
window.__foundryDiagnostics=()=>({
 view:currentTab,rendererCount:document.querySelectorAll('canvas').length,
 mbeLoaded:!!mbeController,
 detailed:{lpe:machine.visible,imm:IMM.visible,mbe:mbeController?.MBE.visible??false},
 proxies:Object.fromEntries(Object.entries(room.proxies).map(([k,p])=>[k,p.visible])),
 drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
 pixelRatio:renderer.getPixelRatio(),shadowMap:renderer.shadowMap.enabled,
 cpuRenderP95ms:p95(cpuRenderMs),
 // Observed frame cadence, including intentional idle throttling; not GPU FPS.
 frameIntervalP95ms:p95(presentIntervalsMs)
});
requestAnimationFrame(animate);
