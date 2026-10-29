import {CMP_TOTAL,cmpAtTime} from './process.js';
import {createCMPUI} from './ui.js';
export function createCMPController(model){
 const ui=createCMPUI();
 let elapsed=0,running=false,done=false,uiTime=0,visualTime=0;
 let value=cmpAtTime(0);
 function refresh(){
  value=cmpAtTime(elapsed);
  ui.update(value,{force:true});
 }
 ui.play.addEventListener('click',()=>{
  if(running){
   running=false;
   ui.play.textContent='▶ Restart CMP Cycle';
   ui.play.classList.remove('running');
   return;
  }
  elapsed=0;done=false;running=true;uiTime=0;visualTime=0;
  value=cmpAtTime(0);
  ui.play.textContent='■ Stop CMP';
  ui.play.classList.remove('done');ui.play.classList.add('running');
  refresh();
 });
 function update(dt,time,visible){
  if(running){
   elapsed=Math.min(CMP_TOTAL,elapsed+Math.max(0,dt));
   value=cmpAtTime(elapsed);
   if(value.done){
    running=false;done=true;
    ui.play.textContent='✓ CMP Complete';
    ui.play.classList.remove('running');ui.play.classList.add('done');
   }
  }
  // Readouts and cross section are intentionally limited to 10 updates/s,
  // independent of the shared WebGL render cadence.
  uiTime+=dt;
  if(visible){
   const visual=running?value:{
    ...value,platenRPM:0,carrierRPM:0,slurryMlMin:0,conditioning:false
   };
   model.setVisual({...visual,_dt:running?dt:0},time,true);
   if(uiTime>=.10||done){ui.update(value);uiTime=0;}
  }
 }
 refresh();
 return {group:model.group,update,refresh,isRunning:()=>running,
  getState:()=>({...value,running,done}),geometry:model.geometry,
  renderOptimization:model.staticStats};
}
