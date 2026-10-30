import {LITHO_TOTAL,LITHO_REAL,LITHO_RECIPE,lithoAtTime} from './process.js';
const $=id=>document.getElementById('litho'+id);
export function createLithoController(model){
 const play=$('PlayBtn'),status=$('Status'),detail=$('Detail'),time=$('Time'),prog=$('Progress'),xsec=$('CrossSection');
 const readouts=Array.from({length:6},(_,i)=>$('V'+(i+1)));
 let seconds=0,running=false,uiAccumulator=0,lastPhase=null;
 let current=lithoAtTime(0);
 let stoppedState=current;
 // Static paths are assembled only once; no expensive per-frame DOM allocation.
 const top='<rect x="0" y="52" width="300" height="48" fill="#3a4a5a"/><rect x="0" y="41" width="300" height="11" fill="#8097ad"/><rect x="0" y="36" width="300" height="5" fill="#343a51"/><text x="5" y="92" fill="#b5cbdc" font-size="8">Silicon substrate</text><text x="5" y="49" fill="#1d2430" font-size="7">Oxide / BARC</text>';
 const resistRects=Array.from({length:40},(_,i)=>'<rect x="'+(i*7.5).toFixed(1)+'" y="12" width="7.5" height="24" class="resist-cell"/>').join('');
 xsec.innerHTML=top+'<g id="lithoResistCells">'+resistRects+'</g><text x="4" y="9" fill="#b7a0ff" font-size="8">100 nm chemically amplified resist</text>';
 const cells=Array.from(xsec.querySelectorAll('.resist-cell'));
 function updateUI(force=false){
  const s=current;
  if(force||s.idx!==lastPhase){lastPhase=s.idx;status.textContent=s.phase.label;detail.textContent=s.phase.description;}
  time.textContent=s.done?'Cycle complete':Math.round(s.elapsed*10)/10+' / '+LITHO_TOTAL+' s · '+s.realMinutes.toFixed(1)+' / '+LITHO_REAL+' min represented';
  prog.style.width=(s.fraction*100).toFixed(1)+'%';
  readouts[0].textContent=s.beamOn?'ON · 193 nm':'Off';
  readouts[1].textContent=s.idx===2?(s.fieldIndex+1)+' / 36':s.idx>2?'36 / 36':'—';
  readouts[2].textContent=s.scanProgress?Math.round(s.scanProgress*100)+'%':'—';
  readouts[3].textContent=s.completedFields+' / 36';
  readouts[4].textContent=s.beamOn?s.dose.toFixed(0)+' / 30 mJ/cm²':'—';
  readouts[5].textContent=s.alignment===1?'LOCKED':s.alignment>0?'Aligning':'—';
  const progress=s.idx>2?1:s.idx===2?(s.fieldIndex+s.scanProgress)/36:0;
  cells.forEach((c,i)=>{
   const lit=Math.max(0,Math.min(1,progress*40-i));
   c.setAttribute('fill',lit>.6?(i%5===0?'#9e78d4':'#8160b5'):'#778aa4');
  });
 }
 play.addEventListener('click',()=>{
  if(running){running=false;stoppedState={...current,beamOn:false};model.setVisual(stoppedState,0,0);play.textContent='▶ Restart Exposure';play.classList.remove('running');updateUI(true);return;}
  seconds=0;current=lithoAtTime(0);stoppedState=current;running=true;lastPhase=null;model.reset();
  play.textContent='■ Stop';play.classList.remove('done');play.classList.add('running');updateUI(true);
 });
 function update(dt,time,visible){
  if(running){seconds=Math.min(LITHO_TOTAL,seconds+Math.max(0,dt));current=lithoAtTime(seconds);
   if(current.done){running=false;stoppedState={...current,beamOn:false};play.textContent='✓ Exposure Complete';play.classList.remove('running');play.classList.add('done');updateUI(true);uiAccumulator=0;}}
  if(visible){
   model.setVisual(running?current:stoppedState,running?dt:0,time);
   if(running){
    uiAccumulator+=dt;
    if(uiAccumulator>=.1){updateUI();uiAccumulator=0;}
   }
  }
 }
 updateUI(true);
 return {group:model.group,renderOptimization:model.stats,update,refresh:()=>updateUI(true),isRunning:()=>running,getState:()=>({...current,running})};
}
