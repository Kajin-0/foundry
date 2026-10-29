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
 const state={process:false,equipment:false};

 function update(){
  for(const [key,{panel,minimize,restore}] of Object.entries(nodes)){
   panel.hidden=state[key];
   restore.hidden=!state[key];
   minimize.setAttribute('aria-expanded',String(!state[key]));
   restore.setAttribute('aria-expanded',String(!state[key]));
  }
  const bothHidden=state.process&&state.equipment;
  document.body.classList.toggle('focus-view',bothHidden);
  focusToggle.setAttribute('aria-pressed',String(bothHidden));
  focusToggle.textContent=bothHidden?'Show panels':'Focus view';
  focusToggle.title=bothHidden?'Show both panels (H)':'Hide both panels (H)';
 }
 function setPanel(key,hidden,{focus=false}={}){
  state[key]=hidden;
  update();
  if(focus)(hidden?nodes[key].restore:nodes[key].minimize).focus();
 }
 function toggleBoth(){
  const hide=!(state.process&&state.equipment);
  state.process=hide;state.equipment=hide;
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
   state.process=false;state.equipment=false;
   update();
   focusToggle.focus();
  }
 });
 update();
 return {state:()=>({...state}),showBoth:()=>{
  state.process=false;state.equipment=false;update();
 }};
}
