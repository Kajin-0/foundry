/**
 * Overlay visibility is intentionally independent of tool selection and
 * process execution. Minimizing a panel only changes its DOM visibility.
 */
export function initPanelVisibility(){
 const nodes={
  process:{
   panel:document.getElementById('leftPanel'),
   minimize:document.getElementById('minimizeProcess'),
   restore:document.getElementById('restoreProcess')
  },
  equipment:{
   panel:document.getElementById('rightPanel'),
   minimize:document.getElementById('minimizeEquipment'),
   restore:document.getElementById('restoreEquipment')
  }
 };
 const focusToggle=document.getElementById('focusToggle');
 const mobileQuery=window.matchMedia('(max-width:760px), (max-width:900px) and (max-height:520px)');
 const mobileEquipment=document.getElementById('mobileEquipment');
 const mobileProcess=document.getElementById('mobileProcess');
 const state={process:mobileQuery.matches,equipment:false};
 function mobileSelect(key){
  if(!mobileQuery.matches)return;
  state.process=key!=='process';
  state.equipment=key!=='equipment';
  update();
 }
 mobileEquipment.addEventListener('click',()=>mobileSelect('equipment'));
 mobileProcess.addEventListener('click',()=>mobileSelect('process'));
 mobileQuery.addEventListener('change',event=>{
  state.process=event.matches;
  state.equipment=false;
  update();
 });

 function update(){
  for(const [key,{panel,minimize,restore}] of Object.entries(nodes)){
   panel.hidden=state[key];
   restore.hidden=!state[key];
   minimize.setAttribute('aria-expanded',String(!state[key]));
   restore.setAttribute('aria-expanded',String(!state[key]));
  }
  const bothHidden=state.process&&state.equipment;
  mobileEquipment.setAttribute('aria-pressed',String(!state.equipment));
  mobileProcess.setAttribute('aria-pressed',String(!state.process));
  document.body.classList.toggle('focus-view',bothHidden);
  focusToggle.setAttribute('aria-pressed',String(bothHidden));
  focusToggle.textContent=bothHidden?'Show panels':'Focus view';
  focusToggle.title=bothHidden?'Show both panels (H)':'Hide both panels (H)';
 }
 function setPanel(key,hidden,{focus=false}={}){
  state[key]=hidden;
  if(!hidden&&mobileQuery.matches)state[key==='process'?'equipment':'process']=true;
  update();
  if(focus)(hidden?nodes[key].restore:nodes[key].minimize).focus();
 }
 function toggleBoth(){
  const hide=!(state.process&&state.equipment);
  state.process=hide;state.equipment=hide;
  if(!hide&&mobileQuery.matches)state.process=true;
  update();
 }
 for(const key of Object.keys(nodes)){
  nodes[key].minimize.addEventListener('click',()=>setPanel(key,true,{focus:true}));
  nodes[key].restore.addEventListener('click',()=>setPanel(key,false,{focus:true}));
 }
 focusToggle.addEventListener('click',toggleBoth);
 document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey)return;
  const target=event.target;
  if(event.key.toLowerCase()==='h'){
   if(target instanceof HTMLElement &&
     (target.isContentEditable||target.closest('input,textarea,select,[contenteditable]')))return;
   event.preventDefault();
   toggleBoth();
  }else if(event.key==='Escape'&&(state.process||state.equipment)){
   event.preventDefault();
   state.process=mobileQuery.matches;state.equipment=false;
   update();
   focusToggle.focus();
  }
 });
 update();
 return {state:()=>({...state}),showBoth:()=>{
  state.process=mobileQuery.matches;state.equipment=false;update();
 }};
}
