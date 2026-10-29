import {CMP_RECIPE,CMP_REAL_MIN,CMP_TOTAL} from './process.js';
const $=id=>document.getElementById('cmp'+id);
export function createCMPUI(){
 const status=$('NarrStatus'),detail=$('NarrDetail'),time=$('NarrTime');
 const progress=$('ProgBar'),xsec=$('XsecContent'),play=$('PlayBtn');
 const readouts=Array.from({length:7},(_,i)=>$('V'+(i+1)));
 let prevPhase='';
 function update(state,{force=false}={}){
  if(force||state.phase.key!==prevPhase){
   prevPhase=state.phase.key;
   status.textContent=state.phase.label;
   status.style.color=state.phase.color;
   detail.textContent=state.phase.detail;
  }
  time.textContent=state.done?'Cycle complete':
   `${Math.round(state.elapsed)} / ${CMP_TOTAL} s demo · ~${state.realMinutes.toFixed(1)} / ${CMP_REAL_MIN.toFixed(1)} min represented`;
  progress.style.width=(state.fraction*100).toFixed(1)+'%';
  readouts[0].textContent=Math.round(state.platenRPM)+' rpm';
  readouts[1].textContent=Math.round(state.carrierRPM)+' rpm';
  readouts[2].textContent=state.pressurePsi.toFixed(1)+' psi';
  readouts[3].textContent=state.removalRateNmMin?state.removalRateNmMin+' nm/min':'—';
  readouts[4].textContent=state.oxideRemovedNm.toFixed(0)+' / 500 nm';
  readouts[5].textContent=state.endpoint?'YES':'no';
  readouts[6].textContent=state.endpoint?
   (state.done?'Complete': 'SiN reached'):'Not reached';
  xsec.innerHTML=crossSection(state);
 }
 function crossSection(s){
  const rem=s.oxideRemovedNm,remaining=Math.max(0,500-rem);
  const oxideH=remaining/500*32,stopTop=60+s.nitrideErodedNm*.4;
  const oxideTop=stopTop-oxideH;
  const dish=s.endpoint?Math.min(2,s.nitrideErodedNm*.6):0;
  // The SiN mask lies on the field only; STI trenches retain their oxide.
  const rect=(x,y,w,h,color,op=1)=>`<rect x="${x}" y="${y.toFixed(2)}" width="${w}" height="${Math.max(0,h).toFixed(2)}" fill="${color}" opacity="${op}"/>`;
  let svg=rect(8,84,284,15,'#596a7a');
  for(const [x,w] of [[70,50],[177,33]]){
   svg+=rect(x,61,w,24,'#8fabc1');
   svg+=rect(x,61+dish,w,dish?'1':'0','#7fc4ff',.7);
  }
  svg+=rect(8,stopTop,62,84-stopTop,'#b8bed2');
  svg+=rect(120,stopTop,57,84-stopTop,'#b8bed2');
  svg+=rect(210,stopTop,82,84-stopTop,'#b8bed2');
  if(remaining>0)svg+=rect(8,oxideTop,284,oxideH,'#98b2c7',.85);
  svg+=`<line x1="8" y1="${stopTop.toFixed(2)}" x2="292" y2="${stopTop.toFixed(2)}" stroke="#7ee6a0" stroke-width=".75" stroke-dasharray="3 2"/>`;
  svg+=`<text x="10" y="10" font-size="8" fill="#c6e1f3">STI · SiO₂ / SiN stop</text>`;
  svg+=`<text x="290" y="10" font-size="8" fill="#7ee6a0" text-anchor="end">${rem.toFixed(0)} / 500 nm</text>`;
  svg+=`<text x="12" y="95" font-size="7" fill="#c3d2e2">Si substrate</text>`;
  svg+=`<text x="12" y="56" font-size="7" fill="#98b6d5">SiN</text>`;
  return svg;
 }
 return {play,update};
}
