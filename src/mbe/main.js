import * as THREE from 'three';
import {createMBEScene} from './scene.js';
import {createMBEUI} from './ui.js';
import {CYCLE,TOTAL,P_BASE,P_GROWTH,ROTATION_RPM,ML_NM,phaseAt,lerpLog,layerThicknessUmAt,rateMLs,previousSetpoint,LAYER_INFO} from './process.js';
const {renderer,scene,camera,controls,clipPlane,MAT,CH_TOP,cells,cellBeams,growthLayers,waferGroup,holder,heaterLight,beamIn,beamOut,bfmPivot}=createMBEScene();
const label=document.createElement('div');
label.className='label3d';label.textContent='MBE · UHV CHAMBER';document.body.appendChild(label);
const labelPoint=new THREE.Vector3();

function freshState(){
 return {t:0,on:false,done:false,idx:-1,press:P_BASE,pLock:760,subT:25,
  gaOpen:0,alOpen:0,asOpen:0,gaT:200,alT:200,asT:200,
  rateMLps:0,mlTotal:0,rheedI:0,rheedHistory:[],bfmSwing:0,
  layerUm:LAYER_INFO.map(()=>0),activeLayer:-1};
}
const S=freshState(), UI=createMBEUI(S);
const play=document.getElementById('playBtn');
const cut=document.getElementById('cut');
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
 S.on=true;resetVisuals();
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
 bfmPivot.rotation.y=-S.bfmSwing*Math.PI*.35;
 MAT.bfmFace.emissiveIntensity=calibration?1.2:0;
 labelPoint.set(0,CH_TOP+1.9,0).project(camera);
 const sx=(labelPoint.x*.5+.5)*innerWidth,sy=(-labelPoint.y*.5+.5)*innerHeight;
 label.style.transform='translate(-50%,-100%) translate('+sx+'px,'+sy+'px)';
 label.style.opacity=labelPoint.z<1?'1':'0';
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
const clock=new THREE.Clock();
let lastDraw=-Infinity,lastUI=-Infinity,lastRHEED=-Infinity;
function animate(now=0){
 requestAnimationFrame(animate);
 if(document.hidden){clock.getDelta();return;}
 const busy=S.on||controls.enabled&&now-lastDraw<120;
 const maxInterval=1000/(S.on?60:24);
 if(now-lastDraw<maxInterval)return;
 const dt=Math.min(.10,clock.getDelta()),t=clock.getElapsedTime();
 lastDraw=now;
 updateProcess(dt,t);
 updateVisuals(dt,t);
 if(now-lastUI>=100){UI.updateReadouts();UI.updateXsec();lastUI=now;}
 if(now-lastRHEED>=65){sampleRHEED(t);lastRHEED=now;}
 controls.update();renderer.render(scene,camera);
}
addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 renderer.setSize(innerWidth,innerHeight);
});
requestAnimationFrame(animate);
