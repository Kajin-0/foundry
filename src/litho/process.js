/** Preset illustrative 193 nm immersion lithography, not a calibrated imaging solver. */
export const LITHO_RECIPE=Object.freeze({wavelengthNm:193,NA:1.35,reduction:4,waferMm:300,fieldMm:[26,33],slitMm:[26,8],doseMjCm2:30,fields:36,resistNm:100,fieldCols:6,fieldRows:6});
export const LITHO_PHASES=Object.freeze([
 {key:'load',duration:1.8,minutes:1.5,label:'READY · wafer clamped',description:'A 300 mm silicon wafer is already secured to the vacuum chuck with chemically amplified resist above BARC and oxide.'},
 {key:'align',duration:2.2,minutes:2,label:'ALIGN · wafer marks',description:'The stage visits four alignment marks and determines a schematic position correction prior to exposure.'},
 {key:'expose',duration:14,minutes:12,label:'EXPOSE · step-and-scan',description:'A 193 nm ArF source projects a slit through the 4× reticle. Reticle and wafer scan in opposite directions at a 4:1 speed ratio.'},
 {key:'finish',duration:1.8,minutes:1.5,label:'RETRACT · exposure complete',description:'The stage returns to its parked position. A latent image remains in the resist for later bake and development.'}
]);
export const LITHO_TOTAL=LITHO_PHASES.reduce((n,p)=>n+p.duration,0);
export const LITHO_REAL=LITHO_PHASES.reduce((n,p)=>n+p.minutes,0);
export const LITHO_FIELD_ORDER=Object.freeze(Array.from({length:36},(_,n)=>{const row=Math.floor(n/6);return row*6+(row%2===0?n%6:5-n%6)}));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function lithoAtTime(t){
 const elapsed=clamp(Number.isFinite(t)?t:0,0,LITHO_TOTAL);
 let offset=0,real=0,idx=LITHO_PHASES.length-1,local=1;
 for(let i=0;i<LITHO_PHASES.length;i++){
  const p=LITHO_PHASES[i];
  if(elapsed<offset+p.duration){idx=i;local=(elapsed-offset)/p.duration;break;}
  if(i===LITHO_PHASES.length-1){idx=i;local=1;break;}
  offset+=p.duration;real+=p.minutes;
 }
 const phase=LITHO_PHASES[idx];
 const exposure=clamp((elapsed-4)/14,0,1);
 const total=exposure*36;
 const fieldIndex=clamp(Math.floor(total),0,35);
 const withinField=clamp(total-fieldIndex,0,1);
 const stepFraction=.28;
 const scanProgress=clamp((withinField-stepFraction)/(1-stepFraction),0,1);
 const expose=idx===2&&withinField>=stepFraction&&elapsed<18;
 const alignment=idx<1?0:idx===1?local:1;
 const completedFields=idx<2?0:idx>2?36:Math.floor(total);
 // One representative slit dose, not a wafer-integrated energy sum.
 return {elapsed,phase,idx,local,done:elapsed===LITHO_TOTAL,
  fraction:elapsed/LITHO_TOTAL,realMinutes:real+phase.minutes*local,
  fieldIndex,fieldAddress:LITHO_FIELD_ORDER[fieldIndex],scanProgress,
  beamOn:expose,alignment,completedFields,
  dose:expose?scanProgress*LITHO_RECIPE.doseMjCm2:idx===3?LITHO_RECIPE.doseMjCm2:0};
}
