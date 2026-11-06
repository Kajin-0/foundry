import * as THREE from 'three';
import {createSceneContext} from './scene/context.js';
import {createGeometryHelpers} from './scene/helpers.js';
import {buildLpe} from './scene/lpe.js';
import {buildIonMill} from './scene/ion-mill.js';
import {buildRoom,BAYS} from './scene/room.js';
import {calculateOverviewView,LAB_FOG_FAR} from './scene/room-layout.js';
import {mergeStaticDrawCalls} from './scene/merge-static.js';
import {createThermalProfile} from './ui/thermal-profile.js';
import {createCrossSection} from './ui/cross-section.js';
import {initPanelVisibility} from './ui/panel-visibility.js';
import {smoothJourney,journeyDurationMs} from './ui/camera-journey.js';
import {BINS,PARK_X,UNLOAD_X,WELL_OFFSETS,CONTACT_THR,ZONES,BASE_TOP,SUB_TOP,MELT_H,SLIDER_BOT} from './config/geometry.js';
import {CYCLE,CYCLE_TOTAL_ANIM,CYCLE_TOTAL_REAL,fmtMin} from './process/lpe-cycle.js';
import {IBE,ibeRate,millMin,P_BASE,P_WORK,P_PREP,IMM_CYCLE,IMM_TOTAL,IMM_MILL,fmtP,imRealMin,lerpLog} from './process/ion-etch.js';

const {renderer,scene,camera,controls,clipPlane,clipPlaneIMM,MAT,keyLight,fill,rimLPE,rimIMM,lowPower:initialLowPower} = createSceneContext();
let lowPower=initialLowPower;
const {cyl,box,boltRing,tubeAlong,makeCoil,annularTube} = createGeometryHelpers(MAT);
const {machine,zoneCoils,zoneLights,growthLayers,growthLayersGroup,contactRing,meltBridge,melts,sliderGroup,subRing,substrate,growthLight,sliderGlow,bubbles,pidScreens,otcLed,inletWheel,meltMats,baseMeltEmissive} = buildLpe({scene,MAT,clipPlane,cyl,box,boltRing,tubeAlong,makeCoil,annularTube});
const {IMM,etchL,wafer,resist,MASK_TOP,RES_H,tiltG,beamCone,plasma,plasmaCore,sputters,chamberLight,neutMat,leafL,leafR,shutterMat,shutterY,BT,BB,stg,RW,FW,vpGlow} = buildIonMill({scene,MAT,cyl,box,annularTube,tubeAlong});
const room=buildRoom(scene);
let overviewView=calculateOverviewView(room.layout,window.innerWidth,window.innerHeight);
let cmpController=null,cmpLoading=null;
let lithoController=null,lithoLoading=null;
let spinController=null,spinLoading=null,implantController=null,implantLoading=null;
const panelVisibility=initPanelVisibility();
const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
let mbeController=null;
let mbeLoading=null;
let currentActiveLayer = null;
let shutOpen = 0;
const XS = createCrossSection(IBE);
const {maybeUpdateProfile} = createThermalProfile();

/* ============ OVERVIEW LABELS / INSTRUMENT ACCESS ============ */
// Lightweight DOM overlay reuses the seven existing machine label positions.
// Labels are interactive only in overview. All click targets refer to the
// same BAYS keys and never construct an additional 3D scene.
const labelData=[
 ['lpe','LPE · FURNACE',0,6.5,0],
 ['imm','ION BEAM ETCH · HIGH VACUUM',BAYS.imm.x,7.5,0],
 ['mbe','MBE · UHV CHAMBER',BAYS.mbe.x,8.2,0],
 ['cmp','CMP · OXIDE POLISH',BAYS.cmp.x,5.3,0],
 ['litho','LITHO · ArF SCANNER',BAYS.litho.x,5.0,0],
 ['spin','SPIN COATER · PHOTORESIST',BAYS.spin.x,2.9,0],
 ['implant','ION IMPLANTER · DOPANT',BAYS.implant.x,3.9,0]
];
const labelByBay={};
for(const [key,title] of labelData){
 const el=document.createElement('div');
 el.className='label3d';el.textContent=title;
 el.dataset.bay=key;el.setAttribute('role','button');el.tabIndex=0;
 el.setAttribute('aria-label','Explore '+BAYS[key].name);
 el.title='Explore '+BAYS[key].name;
 document.body.appendChild(el);
 labelByBay[key]=el;
}
const lpeLabel=labelByBay.lpe,immLabel=labelByBay.imm,
 mbeLabel=labelByBay.mbe,cmpLabel=labelByBay.cmp,
 lithoRoomLabel=labelByBay.litho,
 spinRoomLabel=labelByBay.spin,implantRoomLabel=labelByBay.implant;
const overviewLabels=Object.values(labelByBay);
const labelProject=new THREE.Vector3();
function placeOverviewLabels(){
 if(currentTab!=='overview'||document.body.classList.contains('focus-view'))return;
 const w=window.innerWidth,h=window.innerHeight;
 const narrow=w<=760;
 // The second, raised row prevents verbose equipment names overlapping at
 // the small projected station spacing; no geometry, textures or per-frame
 // text creation are needed. On mobile the grid supplies larger tap targets.
 labelData.forEach(([key,,x,y,z],i)=>{
  const el=labelByBay[key];
  labelProject.set(x,y,z).project(camera);
  const sx=(labelProject.x*.5+.5)*w,sy=(-labelProject.y*.5+.5)*h;
  const inView=labelProject.z>=-1&&labelProject.z<=1&&Math.abs(labelProject.x)<=1.04&&Math.abs(labelProject.y)<=1.04;
  el.style.opacity=inView?'1':'0';
  el.style.pointerEvents=inView&&!narrow?'auto':'none';
  el.style.transform=`translate(-50%, -100%) translate(${sx.toFixed(1)}px, ${(sy-(i%2?43:0)).toFixed(1)}px)`;
 });
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

// Reduce rigid part submissions, not polygon counts. These are direct-child
// static meshes only; exclude every mesh/group whose transform is animated
// by the LPE or ion-mill timelines.
const lpeRenderOptimization=mergeStaticDrawCalls(machine,{
 exclude:new Set([
  ...zoneCoils,...zoneLights,...growthLayers.map(l=>l?.mesh).filter(Boolean),
  growthLayersGroup,contactRing,meltBridge,...melts.map(m=>m.mesh),
  sliderGroup,subRing,substrate,growthLight,sliderGlow,...bubbles,
  ...pidScreens.flatMap(s=>Object.values(s)),otcLed,inletWheel
 ])
});
const immRenderOptimization=mergeStaticDrawCalls(IMM,{
 exclude:new Set([
  ...etchL.flatMap(l=>l?.meshes||[]),wafer,resist,tiltG,beamCone,
  plasma,plasmaCore,...sputters.map(s=>s.mesh),chamberLight,
  leafL,leafR,stg,vpGlow
 ])
});

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
  press: P_PREP, tiltNow: 0, beam: 0, stage: 25, etch: 0,
};

/* ============ DOM ============ */
const narrStatus = document.getElementById('narrStatus');
const narrDetail = document.getElementById('narrDetail');
const narrTime = document.getElementById('narrTime');
const progBarEl = document.getElementById('progBar');
const stackEl = document.getElementById('stack');
const playBtn = document.getElementById('playBtn');
const immBtn = document.getElementById('immBtn');
const ionProgBarEl=document.getElementById('ionProgBar');
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
  narrDetail.textContent = 'One virtual lab with seven independent fabrication tools. Select a station to inspect its equipment and illustrative process.';
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
 overview:{
  pos:new THREE.Vector3(overviewView.centerX,overviewView.targetY+overviewView.height,overviewView.distance),
  tgt:new THREE.Vector3(overviewView.centerX,overviewView.targetY,0)
 },
 lpe:{pos:new THREE.Vector3(7.5,11,22),tgt:new THREE.Vector3(0,2.6,0)},
 imm:{pos:new THREE.Vector3(23,10,12),tgt:new THREE.Vector3(16,3.2,0)},
 mbe:{pos:new THREE.Vector3(36.8,3.8,12.5),tgt:new THREE.Vector3(30,4.4,0)},
 cmp:{pos:new THREE.Vector3(52,7.6,13),tgt:new THREE.Vector3(46,2.2,0)},
 litho:{pos:new THREE.Vector3(68.4,5.0,8.0),tgt:new THREE.Vector3(62,1.95,0)},
 spin:{pos:new THREE.Vector3(82.5,4.5,8.4),tgt:new THREE.Vector3(78,.98,0)},
 implant:{pos:new THREE.Vector3(99,6.4,12),tgt:new THREE.Vector3(94.8,1.3,0)}
};
let camGoal=null;
let framingRecovery=null;
let cameraJourneyTime=0;
// Station picking is performed only on actual pointer movement / release,
// never in the 3D animation/render loop.
const pickRaycaster=new THREE.Raycaster();
const pickPointer=new THREE.Vector2();
const pickTargets=[...Object.values(room.proxies),...Object.values(room.slabs)];
let hoveredBay=null;
let downPointer=null;
let lastPickMs=-Infinity;
function setHoveredBay(key){
 if(key===hoveredBay)return;
 hoveredBay=key;
 for(const [bay,line] of Object.entries(room.outlines)){
  line.material.color.setHex(bay===key?0x84cbff:0x315675);
  line.material.opacity=bay===key?1:.80;
 }
 for(const [bay,el] of Object.entries(labelByBay))el.classList.toggle('hovered',bay===key);
 renderer.domElement.style.cursor=key?'pointer':'';
}
function pickBay(e){
 if(currentTab!=='overview'||document.body.classList.contains('focus-view'))return null;
 const b=renderer.domElement.getBoundingClientRect();
 pickPointer.set(((e.clientX-b.left)/b.width)*2-1,-((e.clientY-b.top)/b.height)*2+1);
 pickRaycaster.setFromCamera(pickPointer,camera);
 const hit=pickRaycaster.intersectObjects(pickTargets,true)[0];
 if(!hit)return null;
 let obj=hit.object;
 while(obj){
  if(obj.userData.bayKey)return obj.userData.bayKey;
  for(const [key,proxy] of Object.entries(room.proxies))if(obj===proxy)return key;
  obj=obj.parent;
 }
 return null;
}
// User input cancels only camera translation/orbit targeting. FOV and fog
// return to the selected station's defaults in the existing RAF; otherwise
// an interrupted transition can leave an unintended narrow/wide lens.
function cancelCameraJourney(){
 if(!camGoal)return;
 camGoal=null;
 const normalDistance=currentTab==='overview'?overviewView.maxDistance:85;
 const radius=camera.position.distanceTo(controls.target);
 // Do not suddenly pull a distant camera in when OrbitControls updates.
 controls.maxDistance=Math.max(normalDistance,radius+.5);
 framingRecovery={
  start:performance.now(),duration:220,
  fromFov:camera.fov,fromFog:scene.fog.far,
  toFov:currentTab==='overview'?overviewView.fov:40,
  toFog:currentTab==='overview'?overviewView.fogFar:LAB_FOG_FAR
 };
}
renderer.domElement.addEventListener('pointerdown',e=>{
 cancelCameraJourney();downPointer={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()};
},{passive:true});
renderer.domElement.addEventListener('pointermove',e=>{
 if(currentTab!=='overview'||e.buttons||e.pointerType==='touch'){
  if(hoveredBay)setHoveredBay(null);
  if(e.buttons)cancelCameraJourney();
  return;
 }
 if(performance.now()-lastPickMs<85)return;
 lastPickMs=performance.now();
 setHoveredBay(pickBay(e));
},{passive:true});
renderer.domElement.addEventListener('pointerleave',()=>setHoveredBay(null),{passive:true});
renderer.domElement.addEventListener('pointerup',e=>{
 const d=downPointer;downPointer=null;
 if(!d||d.id!==e.pointerId||performance.now()-d.time>650||Math.hypot(e.clientX-d.x,e.clientY-d.y)>7)return;
 const hit=pickBay(e);if(hit)switchTab(hit);
},{passive:true});
renderer.domElement.addEventListener('pointercancel',()=>{downPointer=null;},{passive:true});
renderer.domElement.addEventListener('wheel',cancelCameraJourney,{passive:true});
for(const [key,el] of Object.entries(labelByBay)){
 el.addEventListener('pointerenter',()=>setHoveredBay(key));
 el.addEventListener('pointerleave',()=>setHoveredBay(null));
 el.addEventListener('click',()=>switchTab(key));
 el.addEventListener('keydown',e=>{
  if(e.key==='Enter'||e.key===' '){e.preventDefault();switchTab(key);}
 });
}
const tabEls={
 overview:document.getElementById('tabOverview'),
 lpe:document.getElementById('tabLPE'),
 imm:document.getElementById('tabIMM'),
 mbe:document.getElementById('tabMBE'),
 cmp:document.getElementById('tabCMP'),
 litho:document.getElementById('tabLitho'),
 spin:document.getElementById('tabSpin'),
 implant:document.getElementById('tabImplant')
};
const leftLPE=document.getElementById('lpeLeft'),leftMBE=document.getElementById('mbeLeft');
const leftOverview=document.getElementById('overviewLeft');
const rightMBE=document.getElementById('mbeControls');
const rightOverview=document.getElementById('overviewControls');
const mbeButton=document.getElementById('mbePlayBtn');
const cmpButton=document.getElementById('cmpPlayBtn');
const lithoButton=document.getElementById('lithoPlayBtn');
const spinButton=document.getElementById('spinPlayBtn'),implantButton=document.getElementById('implantPlayBtn');
async function ensureSpin(){
 if(spinController)return spinController;
 if(!spinLoading)spinLoading=Promise.all([import('./spin/scene.js'),import('./spin/controller.js')]).then(([m,c])=>{
  const model=m.buildSpin({scene});spinController=c.createSpinController(model);
  model.group.visible=currentTab==='spin';room.setFocus(currentTab);spinButton.disabled=false;
  spinController.refresh();renderer.shadowMap.needsUpdate=true;return spinController;
 }).catch(e=>{spinLoading=null;document.getElementById('spinDetail').textContent='Unable to load spin coater; reload to retry.';console.error(e);throw e});
 return spinLoading;
}
async function ensureImplant(){
 if(implantController)return implantController;
 if(!implantLoading)implantLoading=Promise.all([import('./implant/scene.js'),import('./implant/controller.js')]).then(([m,c])=>{
  const model=m.buildImplanter({scene});implantController=c.createImplantController(model);
  model.group.visible=currentTab==='implant';room.setFocus(currentTab);implantButton.disabled=false;
  implantController.refresh();renderer.shadowMap.needsUpdate=true;return implantController;
 }).catch(e=>{implantLoading=null;document.getElementById('implantDetail').textContent='Unable to load implanter; reload to retry.';console.error(e);throw e});
 return implantLoading;
}
async function ensureLitho(){
 if(lithoController)return lithoController;
 if(!lithoLoading)lithoLoading=Promise.all([import('./litho/scene.js'),import('./litho/controller.js')])
  .then(([modelModule,controllerModule])=>{
   const model=modelModule.buildLitho({scene,camera});
   lithoController=controllerModule.createLithoController(model);
   lithoController.group.visible=currentTab==='litho';
   room.setFocus(currentTab);
   lithoButton.disabled=false;lithoController.refresh();renderer.shadowMap.needsUpdate=true;
   return lithoController;
  }).catch(error=>{lithoLoading=null;document.getElementById('lithoDetail').textContent='Lithography loading failed; reload to retry.';console.error(error);throw error;});
 return lithoLoading;
}

async function ensureCMP(){
 if(cmpController)return cmpController;
 if(!cmpLoading){
  cmpLoading=Promise.all([import('./cmp/scene.js'),import('./cmp/controller.js')])
  .then(([modelModule,controllerModule])=>{
   const model=modelModule.buildCMP({scene,batchStatic:!window.__foundryDisableCmpBatching});
   cmpController=controllerModule.createCMPController(model);
   cmpController.group.visible=currentTab==='cmp';
   room.setFocus(currentTab);
   cmpButton.disabled=false;
   cmpController.refresh();
   renderer.shadowMap.needsUpdate=true;
   return cmpController;
  }).catch(error=>{
   cmpLoading=null;
   cmpButton.disabled=true;
   document.getElementById('cmpNarrDetail').textContent='CMP model could not load. Reload to retry.';
   console.error('CMP station failed:',error);
   throw error;
  });
 }
 return cmpLoading;
}
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
 document.getElementById('lpeOnlyIllustrations').hidden=tab!=='lpe';
 document.getElementById('ionOnlyIllustrations').hidden=tab!=='imm';
 leftMBE.hidden=tab!=='mbe';
 document.getElementById('cmpLeft').hidden=tab!=='cmp';
 document.getElementById('lithoLeft').hidden=tab!=='litho';
  document.getElementById('spinLeft').hidden=tab!=='spin';
  document.getElementById('implantLeft').hidden=tab!=='implant';
 leftOverview.hidden=tab!=='overview';
 lpeControlsEl.style.display=tab==='lpe'?'block':'none';
 immControlsEl.style.display=tab==='imm'?'block':'none';
 rightMBE.hidden=tab!=='mbe';
 document.getElementById('cmpControls').hidden=tab!=='cmp';
 document.getElementById('lithoControls').hidden=tab!=='litho';
  document.getElementById('spinControls').hidden=tab!=='spin';
  document.getElementById('implantControls').hidden=tab!=='implant';
 rightOverview.hidden=tab!=='overview';
}
function switchTab(tab,{instant=false}={}){
 if(!(tab in camPos))tab='overview';
 framingRecovery=null;
 currentTab=tab;
 setHoveredBay(null);
 machine.visible=tab==='lpe';
 IMM.visible=tab==='imm';
 if(mbeController)mbeController.MBE.visible=tab==='mbe';
 if(cmpController)cmpController.group.visible=tab==='cmp';
 if(lithoController)lithoController.group.visible=tab==='litho';
  if(spinController)spinController.group.visible=tab==='spin';
  if(implantController)implantController.group.visible=tab==='implant';
 room.setFocus((tab==='mbe'&&!mbeController)||(tab==='cmp'&&!cmpController)||(tab==='litho'&&!lithoController)||(tab==='spin'&&!spinController)||(tab==='implant'&&!implantController)?'overview':tab);
 for(const [id,button] of Object.entries(tabEls)){
   button.classList.toggle('active',id===tab);
   button.setAttribute('aria-pressed',String(id===tab));
 }
 showProcessPanel(tab);
 // Keep the active tool visible even when a sixth or later station is added.
 tabEls[tab].scrollIntoView({block:'nearest',inline:'nearest'});
 // Preserve camera orientation and framing continuously rather than snapping
 // perspective/fog before the positional move begins. No second RAF.
 const destination=camPos[tab];
 const targetFov=tab==='overview'?overviewView.fov:40;
 const targetFog=tab==='overview'?overviewView.fogFar:LAB_FOG_FAR;
 const destinationDistance=camera.position.distanceTo(destination.pos);
 const duration=journeyDurationMs(destinationDistance,lowPower);
 camGoal=instant||reduceMotion?.matches?null:{
  start:performance.now(),duration,
  fromPos:camera.position.clone(),fromTarget:controls.target.clone(),
  fromFov:camera.fov,fromFog:scene.fog.far,
  toPos:destination.pos.clone(),toTarget:destination.tgt.clone(),
  toFov:targetFov,toFog:targetFog
 };
 cameraJourneyTime=duration;
 camera.far=Math.max(300,overviewView.distance*2.4);
 // Keep intermediate paths (and the panoramic room) inside the orbit limit.
 controls.maxDistance=Math.max(overviewView.maxDistance,85);
 if(!camGoal){
  camera.position.copy(destination.pos);
  controls.target.copy(destination.tgt);
  camera.fov=targetFov;scene.fog.far=targetFog;
 }
 camera.updateProjectionMatrix();
 controls.maxPolarAngle=tab==='mbe'?Math.PI*.73:Math.PI*.495;
 // One physically shared key light; its shadow frustum follows the chosen station.
 const x=tab==='overview'?room.layout.centerX:BAYS[tab].x;
 keyLight.position.set(x+9,18,14);
 keyLight.target.position.set(x,3,0);
 keyLight.target.updateMatrixWorld();
 // Keep the cool fill centered on the selected station across all seven bays.
 fill.position.set(x-10,9,-8);
 fill.target.position.set(x,2.5,0);
 fill.target.updateMatrixWorld();
 rimLPE.visible=tab==='lpe';
 rimIMM.visible=tab==='imm';
 renderer.shadowMap.needsUpdate=true;
 for(const el of overviewLabels){
  el.style.display=tab==='overview'?'block':'none';
  el.tabIndex=tab==='overview'?0:-1;
 }
 document.body.classList.toggle('room-overview',tab==='overview');
 if(tab==='lpe'){
   if(currentPhase){narrStatus.textContent=currentPhase.narr;narrStatus.style.color=currentPhase.color;narrDetail.textContent=currentPhase.detail;}
   else updateIdle();
 }
 if(tab==='imm'){
    if(S.immOn&&S.immIdx>=0){
      const phase=IMM_CYCLE[S.immIdx];
      narrStatus.textContent=phase.narr;narrStatus.style.color=phase.color;
      narrDetail.textContent=typeof phase.detail==='function'?phase.detail():phase.detail;
    } else if(S.hold){
      narrStatus.textContent=S.hold.s;narrStatus.style.color=S.hold.c;
      narrDetail.textContent=S.hold.d;narrTime.textContent=S.hold.t;
    } else {
      narrStatus.textContent='READY · WAFER CLAMPED';narrStatus.style.color='#7fc4ff';
      narrDetail.textContent='The chip is mounted on the cooled stage. Run the preset Ar⁺ process to see vacuum stabilization, beam generation and masked ridge etching.';
      narrTime.textContent='Preset 0.40 µm etch · chamber closed';
    }
  }
  if(tab==='mbe'){
   if(!mbeController){
     mbeButton.disabled=true;
     document.getElementById('mbeNarrDetail').textContent='Opening the MBE station in the shared lab…';
     void ensureMBE();
   } else mbeController.refresh();
 }
 if(tab==='cmp'){
   if(!cmpController){
     cmpButton.disabled=true;
     document.getElementById('cmpNarrDetail').textContent='Loading CMP equipment into the shared lab…';
     void ensureCMP();
   } else cmpController.refresh();
 }
 if(tab==='litho'){
   if(!lithoController){lithoButton.disabled=true;void ensureLitho();}
   else lithoController.refresh();
 }
 if(tab==='spin'){
   if(!spinController){spinButton.disabled=true;void ensureSpin();}
   else spinController.refresh();
 }
 if(tab==='implant'){
   if(!implantController){implantButton.disabled=true;void ensureImplant();}
   else implantController.refresh();
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

// Preset educational recipe: the cutaway is the only adjustable slider.
immBtn.addEventListener('click',()=>{
 if(S.immOn){
   S.immOn=false;S.beam=0;S.tiltNow=0;S.press=P_BASE;S.stage=25;
   S.hold={s:'ABORTED · beam off',c:'#ff8a5a',
     d:'Beam and Ar flow stopped; shutter closes and stage levels. The chip stays clamped inside the chamber.',
     t:narrTime.textContent};
   immBtn.textContent='▶ Run Ion Mill';immBtn.classList.remove('running');
   return;
 }
 S.immT=0;S.immIdx=-1;S.immDone=false;S.immOn=true;
 S.etch=0;S.press=P_PREP;S.tiltNow=0;S.beam=0;S.stage=25;S.hold=null;
 ionProgBarEl.style.width='0%';
 etchL.forEach(l=>{if(l)l.meshes.forEach(m=>{m.visible=true;m.scale.y=1;m.position.y=l.baseY+l.h/2;});});
 resist.scale.y=1;resist.position.y=MASK_TOP+RES_H/2;shutOpen=0;XS.update(0,1);
 immBtn.textContent='■ Stop Mill';immBtn.classList.add('running');immBtn.classList.remove('done');
});

/* ============ INIT ============ */
updateIdle();
const initialTab=new URLSearchParams(window.location.search).get('tool');
switchTab(initialTab in camPos ? initialTab : 'overview',{instant:true});

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

let lastLpeUiTick=-Infinity,lastImmUiTick=-Infinity;
function updateLPEState(dt, t) {
  // Keep animated geometry smooth, but refresh HUD/SVG at no more than 10 Hz.
  const uiDue=currentTab==='lpe' && (t-lastLpeUiTick>=.10);
  if(uiDue)lastLpeUiTick=t;
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

    if (uiDue) {
      progBarEl.style.width = (cycleT / CYCLE_TOTAL_ANIM * 100).toFixed(1) + '%';
      const elapsedReal = CYCLE.slice(0, idx).reduce((a, p) => a + p.realMin, 0) + localT * CYCLE[idx].realMin;
      narrTime.textContent = `${fmtMin(elapsedReal)} / ${fmtMin(CYCLE_TOTAL_REAL)} simulated · ${Math.round(CYCLE_TOTAL_ANIM)} s demo`;
    }
    if(uiDue){updateZoneReadouts(displayTemp);maybeUpdateProfile(displayTemp);}
  } else {
    sliderTargetX = cycleDone ? UNLOAD_X : PARK_X;
    if (cycleDone) {
      displayTemp = Math.max(25, displayTemp - 1.5);
      if (uiDue) {
        narrStatus.textContent = 'LPE COMPLETE';
        narrStatus.style.color = '#7ee6a0';
        narrDetail.textContent = `${depositedLayers} layers · 2.1 µm total · DH structure finished. Switch to Ion Mill to pattern a ridge.`;
        narrTime.textContent = `${fmtMin(CYCLE_TOTAL_REAL)} simulated cycle · complete`;
      }
      if(uiDue){updateZoneReadouts(displayTemp);maybeUpdateProfile(displayTemp);}
    } else if (uiDue) {
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
  const uiDue=currentTab==='imm' && (t-lastImmUiTick>=.10);
  if(uiDue)lastImmUiTick=t;
  /* LPE's idle branch rewrites the narrator every frame while the mill is stopped; re-assert the mill's result */
  if (uiDue && !S.immOn && S.hold && currentTab === 'imm' && !cycleActive) {
    narrStatus.textContent = S.hold.s; narrStatus.style.color = S.hold.c; narrDetail.textContent = S.hold.d; narrTime.textContent = S.hold.t;
  }
  if (S.immOn) {
    S.immT += dt;
    if (S.immT >= IMM_TOTAL) {
      S.immT = IMM_TOTAL;
      S.immOn = false; S.immDone = true;
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

    S.press = ph.cP ? lerpLog(ph.cP[0], ph.cP[1], localT) : S.press;
    S.beam  = (prev.tB || 0) + (ph.tB - (prev.tB || 0)) * localT;
    S.stage = (prev.tS || 25) + (ph.tS - (prev.tS || 25)) * localT;

    S.etch = ph.etch ? localT : (idx > IMM_MILL ? 1 : 0);   /* tied to phase progress: no integration drift */
    S.elapsedReal = IMM_CYCLE.slice(0, idx).reduce((a, p, k) => a + imRealMin(k), 0) + localT * imRealMin(idx);
    S.tiltNow = ph.tilt ? IBE.tilt : ph.tiltOut ? IBE.tilt * (1 - localT) : 0;

    if(uiDue){
      ionProgBarEl.style.width=(S.immT/IMM_TOTAL*100).toFixed(1)+'%';
      narrTime.textContent=`IBE · ${fmtMin(S.elapsedReal)} of ${fmtMin(IMM_CYCLE.reduce((a,p,k)=>a+imRealMin(k),0))} real · demo ${Math.round(S.immT)}s / ${IMM_TOTAL}s`;
    }
  }

  /* DOM readouts are 10 Hz; process physics/geometry remain frame-accurate. */
  if(uiDue){
  document.getElementById('v1').textContent = fmtP(S.press);
  document.getElementById('v2').textContent = S.beam.toFixed(2) + ' mA/cm²';
  document.getElementById('v3').textContent = Math.round(S.stage) + ' °C · ' + Math.round(THREE.MathUtils.radToDeg(tiltG.rotation.x)) + '° tilt';
  const dNow = S.etch * IBE.depth, rem = IBE.UPPER - dNow;
  document.getElementById('v4').textContent = S.etch > 0 ? Math.round(dNow * 1000) + ' nm @ ' + ibeRate(IBE.tilt).toFixed(0) + ' nm/min' : '—';
  const v5 = document.getElementById('v5');
  v5.textContent = S.etch > 0 ? (rem > 0 ? rem.toFixed(2) + ' µm' : 'ACTIVE HIT') : '—';
  v5.style.color = S.etch > 0 && rem < 0.05 ? '#ff6a5a' : '';
  document.getElementById('v6').textContent = S.etch > 0 ? Math.max(0, IBE.resistT - dNow / IBE.sel).toFixed(2) + ' µm' : '—';
  }

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
  // Wafer stays clamped to the stage; transfer is outside the demonstration.
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
  if(uiDue)XS.update(S.etch * IBE.depth, resLeft);
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
 const focusActive=currentTab==='lpe'&&cycleActive||currentTab==='imm'&&S.immOn||currentTab==='mbe'&&mbeController?.isRunning()||currentTab==='cmp'&&cmpController?.isRunning()||currentTab==='litho'&&lithoController?.isRunning()||currentTab==='spin'&&spinController?.isRunning()||currentTab==='implant'&&implantController?.isRunning();
 const moving=!!camGoal||!!framingRecovery||now-lastInteractionMs<750;
 // Do not artificially restrict interaction to 30/45 Hz on capable GPUs.
 const targetFps=lowPower?(focusActive||moving?45:18):(focusActive||moving?60:24);
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
 if(cmpController && (currentTab==='cmp'||cmpController.isRunning())){
   cmpController.update(dt,t,currentTab==='cmp');
 }
 if(lithoController&&(currentTab==='litho'||lithoController.isRunning())){
   lithoController.update(dt,t,currentTab==='litho');
 }
  if(spinController&&(currentTab==='spin'||spinController.isRunning()))
    spinController.update(dt,t,currentTab==='spin');
  if(implantController&&(currentTab==='implant'||implantController.isRunning()))
    implantController.update(dt,t,currentTab==='implant');
 if(camGoal){
  const raw=(now-camGoal.start)/camGoal.duration;
  const eased=smoothJourney(raw);
  camera.position.lerpVectors(camGoal.fromPos,camGoal.toPos,eased);
  controls.target.lerpVectors(camGoal.fromTarget,camGoal.toTarget,eased);
  camera.fov=THREE.MathUtils.lerp(camGoal.fromFov,camGoal.toFov,eased);
  scene.fog.far=THREE.MathUtils.lerp(camGoal.fromFog,camGoal.toFog,eased);
  camera.updateProjectionMatrix();
  if(raw>=1){
   camGoal=null;
   controls.maxDistance=currentTab==='overview'?overviewView.maxDistance:85;
  }
 }else if(framingRecovery){
  // Finish lens/fog restoration without changing the user's orbit position.
  const raw=(now-framingRecovery.start)/framingRecovery.duration;
  const eased=smoothJourney(raw);
  camera.fov=THREE.MathUtils.lerp(framingRecovery.fromFov,framingRecovery.toFov,eased);
  scene.fog.far=THREE.MathUtils.lerp(framingRecovery.fromFog,framingRecovery.toFog,eased);
  camera.updateProjectionMatrix();
  if(raw>=1)framingRecovery=null;
 }
 controls.update();
 if(currentTab==='overview')placeOverviewLabels();
 // Static shadow atlases are not regenerated on every camera frame.
 if(renderer.shadowMap.enabled&&(now-lastShadowMs>400)&&(focusActive||moving)){
   renderer.shadowMap.needsUpdate=true;lastShadowMs=now;
 }
 const renderStart=performance.now();
 renderer.render(scene,camera);
 recordSample(cpuRenderMs,performance.now()-renderStart);
}
window.addEventListener('resize',()=>{
 camera.aspect=window.innerWidth/window.innerHeight;
 overviewView=calculateOverviewView(room.layout,window.innerWidth,window.innerHeight);
 camPos.overview.pos.set(overviewView.centerX,overviewView.targetY+overviewView.height,overviewView.distance);
 camPos.overview.tgt.set(overviewView.centerX,overviewView.targetY,0);
 // A rotated phone or resized browser must update the GPU budget as well.
 lowPower=window.innerWidth<900||
   !!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);
 // Restore the original full-resolution shadow atlas when switching back
 // to a desktop-sized viewport. Reallocate only if the budget changed.
 const shadowResolution=lowPower?512:1024;
 if(keyLight.shadow.mapSize.x!==shadowResolution){
   keyLight.shadow.mapSize.set(shadowResolution,shadowResolution);
   if(keyLight.shadow.map){keyLight.shadow.map.dispose();keyLight.shadow.map=null;}
 }
 renderer.shadowMap.enabled=!lowPower;
 renderer.shadowMap.needsUpdate=true;
 renderer.setSize(window.innerWidth,window.innerHeight);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,lowPower?1:1.25));
 if(currentTab==='overview'){
   camera.far=Math.max(300,overviewView.distance*2.4);
   controls.maxDistance=overviewView.maxDistance;
   framingRecovery=null;
   if(reduceMotion?.matches){
    camGoal=null;
    camera.position.copy(camPos.overview.pos);
    controls.target.copy(camPos.overview.tgt);
    camera.fov=overviewView.fov;scene.fog.far=overviewView.fogFar;
   }else{
    // Reframe only the overview when its own viewport changes.
    const dest=camPos.overview;
    camGoal={start:performance.now(),duration:journeyDurationMs(camera.position.distanceTo(dest.pos),lowPower),
     fromPos:camera.position.clone(),fromTarget:controls.target.clone(),
     fromFov:camera.fov,fromFog:scene.fog.far,
     toPos:dest.pos.clone(),toTarget:dest.tgt.clone(),
     toFov:overviewView.fov,toFog:overviewView.fogFar};
   }
 }
 camera.updateProjectionMatrix();
});
// Exposes lightweight, read-only render diagnostics for browser tests / profiling.
window.__foundryDiagnostics=()=>({
 view:currentTab,panels:panelVisibility.state(),rendererCount:document.querySelectorAll('canvas').length,
 mbeLoaded:!!mbeController,
 cmpLoaded:!!cmpController,
 lithoLoaded:!!lithoController,
 spinLoaded:!!spinController,implantLoaded:!!implantController,
 spinState:spinController?.getState()??null,implantState:implantController?.getState()??null,
 spinRenderOptimization:spinController?.renderOptimization??null,implantRenderOptimization:implantController?.renderOptimization??null,
 lithoState:lithoController?.getState()??null,
 lithoRenderOptimization:lithoController?.renderOptimization??null,
 cmpState:cmpController?.getState()??null,
 cmpGeometry:cmpController?.geometry??null,
 cmpRenderOptimization:cmpController?.renderOptimization??null,
 mbeRenderOptimization:mbeController?.renderOptimization??null,
 lpeRenderOptimization,immRenderOptimization,
 ionMill:{waferLocalPosition:wafer.position.toArray(),waferMounted:wafer.userData.mountedOnStage,
   assembly:IMM.userData.ionMillAssembly,presetTilt:IBE.tilt,presetDepth:IBE.depth},
 detailed:{lpe:machine.visible,imm:IMM.visible,mbe:mbeController?.MBE.visible??false,cmp:cmpController?.group.visible??false,litho:lithoController?.group.visible??false,spin:spinController?.group.visible??false,implant:implantController?.group.visible??false},
 proxies:Object.fromEntries(Object.entries(room.proxies).map(([k,p])=>[k,p.visible])),
 drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
 lighting:{exposure:renderer.toneMappingExposure,keyIntensity:keyLight.intensity,fillIntensity:fill.intensity,fillTarget:fill.target.position.toArray()},
 pixelRatio:renderer.getPixelRatio(),shadowMap:renderer.shadowMap.enabled,
 shadowResolution:keyLight.shadow.mapSize.x,
  ground:{floorSize:room.layout.floorSize,gridSize:room.layout.gridSize,
   gridDivisions:room.layout.gridDivisions,shared:true},
  roomBounds:{minX:room.layout.minX,maxX:room.layout.maxX,
   centerX:room.layout.centerX,span:room.layout.span,wallWidth:room.layout.wallWidth},
  viewGeometry:{fov:camera.fov,far:camera.far,fogFar:scene.fog.far,
   maxDistance:controls.maxDistance},
 cpuRenderP95ms:p95(cpuRenderMs),
 // Observed frame cadence, including intentional idle throttling; not GPU FPS.
 frameIntervalP95ms:p95(presentIntervalsMs),
 cameraPosition:camera.position.toArray(),cameraTarget:controls.target.toArray(),
 cameraJourney:{active:!!camGoal,durationMs:cameraJourneyTime,fromFov:camGoal?.fromFov??camera.fov,toFov:camGoal?.toFov??camera.fov},
 framingRecovery:{active:!!framingRecovery,targetFov:framingRecovery?.toFov??null,targetFog:framingRecovery?.toFog??null},
 hoveredBay,overviewLabels:overviewLabels.length
});
requestAnimationFrame(animate);
