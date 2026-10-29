import * as THREE from 'three';
import {createMBEUI} from './ui.js';
import {CYCLE,TOTAL,P_BASE,P_GROWTH,ROTATION_RPM,ML_NM,phaseAt,lerpLog,layerThicknessUmAt,rateMLs,previousSetpoint,LAYER_INFO} from './process.js';
// MBE shares the one room renderer, camera, and render clock.
export function createMBEController(model) {
const {MBE,clipPlane,MAT,CH_TOP,cells,cellBeams,growthLayers,waferGroup,holder,heaterLight,beamIn,beamOut,bfmPivot}=model;
function freshState(){
 return {t:0,on:false,done:false,idx:-1,press:P_BASE,pLock:760,subT:25,
  gaOpen:0,alOpen:0,asOpen:0,gaT:200,alT:200,asT:200,
  rateMLps:0,mlTotal:0,rheedI:0,rheedHistory:[],bfmSwing:0,
  layerUm:LAYER_INFO.map(()=>0),activeLayer:-1};
}
const S=freshState(), UI=createMBEUI(S);
// The substrate is still in the load lock until the transfer phase.
waferGroup.visible=false;
const play=document.getElementById('mbePlayBtn');
const cut=document.getElementById('mbeCut');
function applyCut(){clipPlane.constant=1.55-Number(cut.value)/100*2.9;}
cut.addEventListener('input',applyCut);applyCut();

function resetVisuals(){
 for(const l of growthLayers){
   l.mesh.visible=false;l.mesh.scale.y=0.001;l.mesh.material.emissiveIntensity=.15;
 }
 UI.clearRHEED();UI.updateXsec();
}
function stopCycle(){
 S.on=false;S.rateMLps=0;S.activeLayer=-1;S.gaOpen=S.alOpen=S.asOpen=0;
 play.textContent='▶ Run MBE Cycle';play.classList.remove('running');UI.setIdle();UI.updateReadouts();
}
play.addEventListener('click',()=>{
 if(S.on){stopCycle();return;}
 Object.assign(S,freshState());
 S.on=true;waferGroup.visible=false;resetVisuals();
 play.textContent='■ Stop Cycle';play.classList.remove('done');play.classList.add('running');
 UI.updateReadouts();
});
function easeShutter(from,to,local){
 const t=Math.min(1,Math.max(0,local*8)), smooth=t*t*(3-2*t);
 return from+(to-from)*smooth;
}
function updateProcess(dt,wallTime){
 if(!S.on)return;
 S.t=Math.min(TOTAL,S.t+dt);
 const {idx,phase:p,local}=phaseAt(S.t), prev=idx>0?CYCLE[idx-1]:{gaO:0,alO:0,asO:0,subT:25};
 if(idx!==S.idx){S.idx=idx;UI.setPhase(p);}
 S.subT=prev.subT+(p.subT-prev.subT)*local;
 // Transfer is compressed; reveal the wafer only after the BFM retracts and transfer begins.
 waferGroup.visible=idx>5||(idx===5&&local>0.55);
 for(const k of ['gaT','alT','asT']){
   const start=previousSetpoint(idx,k), end=p[k]===undefined?start:p[k];
   S[k]=start+(end-start)*local;
 }
 for(const [k,flag] of [['gaOpen','gaO'],['alOpen','alO'],['asOpen','asO']])
   S[k]=easeShutter(prev[flag]||0,p[flag]||0,local);
 S.pLock=p.pLock!==undefined?lerpLog(prev.pLock===undefined?760:prev.pLock,p.pLock,local):S.pLock;
 // Pressure at chamber gauge is not source BEP. These are illustrative values.
 let basePressure=P_BASE;
 if(p.pEnd!==undefined){
   let previous=P_BASE;
   for(let j=idx-1;j>=0;j--)if(CYCLE[j].pEnd!==undefined){previous=CYCLE[j].pEnd;break;}
   basePressure=lerpLog(previous,p.pEnd,local);
 } else if(idx===6){ // Degas exits after a pressure excursion during transfer.
   basePressure=lerpLog(5e-10,P_BASE,local);
 }
 const beamPressure=P_BASE+(P_GROWTH-P_BASE)*S.asOpen+2e-9*(S.gaOpen+S.alOpen);
 S.press=Math.max(basePressure,beamPressure);
 S.rateMLps=p.growthLayer===undefined?0:rateMLs(p.gaO,p.alO);
 S.activeLayer=p.growthLayer===undefined?-1:p.growthLayer;
 S.layerUm=layerThicknessUmAt(S.t);
 S.mlTotal=S.layerUm.reduce((a,b)=>a+b,0)*1000/ML_NM;
 growthLayers.forEach((l,i)=>{
   const fraction=Math.max(0,Math.min(1,S.layerUm[i]/LAYER_INFO[i].thick));
   l.mesh.visible=fraction>0;
   const renderedHeight=l.height*fraction;
   l.mesh.scale.y=Math.max(0.0001,renderedHeight);
   l.mesh.position.y=l.baseY-renderedHeight/2;
   l.mesh.material.emissiveIntensity=i===S.activeLayer?(.21+.04*Math.sin(wallTime*4)):.15;
 });
 if(S.t>=TOTAL){
   S.on=false;S.done=true;S.rateMLps=0;S.activeLayer=-1;
   play.textContent='✓ Growth Complete';play.classList.remove('running');play.classList.add('done');
   UI.setIdle();
 }
}
function updateVisuals(dt,t){
 for(let i=0;i<cells.length;i++){
   const cell=cells[i], temperature=S[cell.kKey+'T'];
   const hotness=Math.max(0,Math.min(1,(temperature-200)/1000));
   cell.coil.material.emissiveIntensity=hotness*2.4;
   const open=[S.gaOpen,S.alOpen,S.asOpen][i];
   cell.hinge.rotation.y=open*Math.PI*.55;
   cell.dot.material.emissiveIntensity=open>.5?3.5:.2;
   cellBeams[i].material.opacity=open*(i===2?.28:.42);
 }
 const heater=Math.max(0,Math.min(1,(S.subT-300)/500));
 MAT.waBase.emissive.setHex(0xff3010);MAT.waBase.emissiveIntensity=heater*1.8;
 MAT.moly.emissiveIntensity=heater*3;heaterLight.intensity=heater*5;
 if(S.on&&S.idx>=5){
   waferGroup.rotation.y+=ROTATION_RPM*Math.PI/30*dt;
   holder.rotation.y=waferGroup.rotation.y;
 }
 const rheedActive=(S.on&&S.idx>=6)||S.done;
 const smoothing=Math.min(1,dt*3);
 beamIn.material.opacity+=((rheedActive?.55:0)-beamIn.material.opacity)*smoothing;
 beamOut.material.opacity+=((rheedActive?.35+(S.rheedI/100)*.5:0)-beamOut.material.opacity)*smoothing;
 MAT.rheedScr.emissiveIntensity=rheedActive?.4+S.rheedI/100*2:0;
 MAT.gauge.emissiveIntensity=S.press<1e-4?1.4:0;
 const calibration=S.on&&CYCLE[S.idx]?.calibrate;
 const bfmTarget=calibration?1:0;
 S.bfmSwing+=(bfmTarget-S.bfmSwing)*Math.min(1,dt*2);
 bfmPivot.rotation.y=-S.bfmSwing*Math.PI;
 MAT.bfmFace.emissiveIntensity=calibration?1.2:0;

}
function sampleRHEED(t){
 if(!(S.on||S.done))return;
 const p=CYCLE[Math.max(S.idx,0)];
 let intensity=0;
 if(S.idx>=6){
   if(p.growthLayer!==undefined){
     // Oscillations are deliberately time-compressed for teaching, not a physical RHEED calculation.
     const {local}=phaseAt(S.t);
     intensity=50+42*Math.cos(2*Math.PI*t/1.15)*(1-.35*local);
   } else if(S.idx===7){
     intensity=20+60*phaseAt(S.t).local;
   } else intensity=68+2*Math.sin(t);
 }
 UI.sampleRHEED(intensity);
}
let uiAccumulator=0,rheedAccumulator=0;
function update(dt,wallTime,visible){
 // Background growth is allowed, but offscreen machines do not redraw GPU
 // materials, SVG traces or hundreds of DOM readouts each frame.
 if(S.on)updateProcess(dt,wallTime);
 if(visible) {
   updateVisuals(dt,wallTime);
   uiAccumulator+=dt;
   rheedAccumulator+=dt;
   if(uiAccumulator>=0.10){UI.updateReadouts();UI.updateXsec();uiAccumulator=0;}
   if(rheedAccumulator>=0.065){sampleRHEED(wallTime);rheedAccumulator=0;}
 }
}
function refresh() {
 updateVisuals(0,0);
 UI.updateReadouts();
 UI.updateXsec();
}
return {MBE, update, refresh, isRunning:()=>S.on, state:S};
}
