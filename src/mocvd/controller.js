// Fixed educational MOVPE demo. No user-adjustable recipe or calibrated kinetics.
export const MOCVD_PRESET=Object.freeze({
 material:'In₀.₅₃Ga₀.₄₇As',substrate:'InP (100)',batch:6,
 waferDiameterMm:100,tempC:620,pressureTorr:100,
 indiumFeedFraction:.53,groupVtoIII:100,growthRateUmH:2,
 thicknessUm:2.5,bandgapEv:.73814,bandgapLambdaUm:1.6796,
 physicalGrowthMin:75,estimatedCycleMin:160
});
export const MOCVD_MODEL_SECONDS=40;
export const MOCVD_DEMO_SPEED=2;
const phaseNames={idle:'IDLE',load:'PREPARE',heat:'HEAT',stabilize:'STABILIZE',
 grow:'GROW',cool:'COOL',unload:'PURGE / VENT',done:'COMPLETE',stopped:'STOPPED'};
const details={
 idle:'Six InP wafers are pre-positioned on the susceptor; Run shows an illustrative III–V growth cycle.',
 load:'Pump-down and transfer preparation are schematic; wafers remain mounted.',
 heat:'Heat toward 620 °C under Group V protection (illustrative).',
 stabilize:'Thermal stabilization before introducing the Group III sources.',
 grow:'InGaAs at a nominal 2.0 µm/h; the visible film height is exaggerated.',
 cool:'Group III isolated, then Group V stopped before inert purge.',
 unload:'Source isolation, nitrogen purge and vent are represented schematically.',
 done:'The six pre-positioned wafers received the simulated InGaAs layer.',
 stopped:'Demonstration stopped; press Run to restart.'
};
export function mocvdPhaseAt(t){
 if(t>=40)return 'done';
 if(t<4)return 'load';if(t<9)return 'heat';if(t<11)return 'stabilize';
 if(t<30)return 'grow';if(t<37)return 'cool';return 'unload';
}
export function mocvdStateAt(time){
 const simTime=Math.max(0,Math.min(40,Number.isFinite(time)?time:0));
 const phase=mocvdPhaseAt(simTime);
 const thickness=MOCVD_PRESET.thicknessUm*Math.max(0,Math.min(1,(simTime-11)/19));
 const T_now=simTime<4?25:simTime<9?25+(MOCVD_PRESET.tempC-25)*(simTime-4)/5:
  simTime<30?MOCVD_PRESET.tempC:
  simTime<37?MOCVD_PRESET.tempC-(MOCVD_PRESET.tempC-100)*(simTime-30)/7:100;
 const pressure=phase==='done'?'760 Torr N₂':phase==='load'?'760→100 Torr':
  phase==='unload'?'100→760 Torr N₂':'100 Torr';
 return {phase,simTime,T_now,thickness,target_um:MOCVD_PRESET.thicknessUm,
  growthRate:phase==='grow'?MOCVD_PRESET.growthRateUmH:0,pressure,
  rotationRpm:['heat','stabilize','grow','cool'].includes(phase)?60:0};
}
export function createMocvdController(model){
 const el=id=>document.getElementById(id);
 const btn=el('mocvdPlayBtn'),cut=el('mocvdCut');
 let time=0,running=false,stopped=false,uiAccum=0;
 function state(){
  const s=mocvdStateAt(time);
  return {...s,phase:stopped?'stopped':s.phase,running};
 }
 function refresh(){
  const s=state();
  el('mocvdStatus').textContent=phaseNames[s.phase];
  el('mocvdDetail').textContent=details[s.phase];
  el('mocvdTime').textContent=`${Math.round(s.simTime/40*100)}% · 160 min illustrative cycle · ~20 s demo`;
  el('mocvdProgress').style.width=(s.simTime/40*100).toFixed(1)+'%';
  el('mocvdThickness').textContent=s.thickness.toFixed(2)+' / 2.50 µm';
  el('mocvdTemp').textContent=Math.round(s.T_now)+' °C';
  el('mocvdPressure').textContent=s.pressure;
  el('mocvdRotation').textContent=s.rotationRpm+' rpm';
  btn.textContent=running?'■ Stop Deposition':s.phase==='done'?'✓ Deposition Complete':'▶ Run Deposition';
  btn.classList.toggle('running',running);btn.classList.toggle('done',s.phase==='done');
 }
 btn.addEventListener('click',()=>{
  if(running){running=false;stopped=true;model.setVisual(state(),0);refresh();return;}
  running=true;stopped=false;time=0;model.setVisual(state(),0);refresh();
 });
 cut.addEventListener('input',()=>model.setCut(Number(cut.value)/100));
 model.setCut(Number(cut.value)/100);
 function update(dt,now,visible){
  if(running){
   time=Math.min(40,time+Math.max(0,dt)*MOCVD_DEMO_SPEED);
   if(time>=40)running=false;
  }
  if(visible){
   model.setVisual(state(),dt);uiAccum+=dt;
   if(uiAccum>=.10||!running){refresh();uiAccum=0;}
  }
 }
 refresh();model.setVisual(state(),0);
 return {group:model.group,update,refresh,isRunning:()=>running,
  getState:state,renderOptimization:model.staticStats};
}
