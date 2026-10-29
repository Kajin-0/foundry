/**
 * Educational oxide-CMP recipe adapted from the supplied standalone demo.
 * Preset values describe an illustrative STI test coupon, NOT a calibrated
 * Preston coefficient, a qualified silicon process, or a continuation of the
 * separate GaAs/AlGaAs laser-wafer process.
 */
export const CMP_RECIPE=Object.freeze({
 platenRPM:80,carrierRPM:75,pressurePsi:3,
 waferOffset:1,platenRadius:2,
 padConditionerLb:6,slurryMlMin:200,
 slurryPH:10.5,particleNm:120,
 oxideTargetNm:500,oxideRateNmMin:100,
 nitrideRateNmMin:5
});
export const CMP_PHASES=Object.freeze([
 {key:'load',duration:2,minutes:1,label:'READY · wafer secured',color:'#7fc4ff',
  detail:'The wafer is already secured face-down in the carrier. This demonstration focuses on polishing, not robotic loading.',
  platenRPM:0,carrierRPM:0,pressurePsi:0,lift:1,slurry:0,condition:false},
 {key:'condition',duration:2,minutes:1,label:'PAD PREP · conditioning',color:'#ffaa66',
  detail:'A diamond conditioner refreshes pad asperities while the platen turns. Slurry delivery begins before wafer contact.',
  platenRPM:30,carrierRPM:0,pressurePsi:0,lift:1,slurry:80,condition:true},
 {key:'polish',duration:12,minutes:5,label:'POLISH · oxide removal',color:'#7ee6a0',
  detail:'The off-center carrier lowers onto the moving polyurethane pad. Alkaline silica slurry and relative motion remove oxide; removal rate is an illustrative preset.',
  platenRPM:80,carrierRPM:75,pressurePsi:3,lift:0,slurry:200,condition:true},
 {key:'overpolish',duration:2,minutes:.5,label:'ENDPOINT · short overpolish',color:'#7ee6a0',
  detail:'The SiN stop layer is exposed. A 30 s illustrative overpolish removes residual oxide and erodes about 2.5 nm of SiN at the stated 5 nm/min rate.',
  platenRPM:80,carrierRPM:75,pressurePsi:2.5,lift:0,slurry:200,condition:true},
 {key:'unload',duration:1.5,minutes:1,label:'RETRACT · head lifts',color:'#7fc4ff',
  detail:'Down-force is released, the carrier lifts clear of the pad and both rotations spin down. The wafer remains secured to the head.',
  platenRPM:0,carrierRPM:0,pressurePsi:0,lift:1,slurry:0,condition:false}
]);
export const CMP_TOTAL=CMP_PHASES.reduce((t,p)=>t+p.duration,0);
export const CMP_REAL_MIN=CMP_PHASES.reduce((t,p)=>t+p.minutes,0);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const ease=x=>x*x*(3-2*x);
export function cmpAtTime(seconds){
 const elapsed=clamp(seconds,0,CMP_TOTAL);
 let start=0,idx=CMP_PHASES.length-1,local=1,realStart=0;
 for(let i=0;i<CMP_PHASES.length;i++){
  const ph=CMP_PHASES[i];
  if(elapsed<start+ph.duration){
   idx=i;local=(elapsed-start)/ph.duration;break;
  }
  if(i===CMP_PHASES.length-1){idx=i;local=1;break;}
  start+=ph.duration;realStart+=ph.minutes;
 }
 const phase=CMP_PHASES[idx],prior=CMP_PHASES[Math.max(idx-1,0)];
 const smooth=ease(local);
 const param=(key)=>prior[key]+(phase[key]-prior[key])*smooth;
 const polish=CMP_PHASES[2],polishStart=CMP_PHASES[0].duration+CMP_PHASES[1].duration;
 // First 10% of polishing is head approach. Only remove film at contact.
 const contactFraction=.10;
 const oxideRemovedNm=clamp((elapsed-polishStart-polish.duration*contactFraction)/
  (polish.duration*(1-contactFraction)),0,1)*CMP_RECIPE.oxideTargetNm;
 const overStart=polishStart+polish.duration;
 const overFraction=clamp((elapsed-overStart)/CMP_PHASES[3].duration,0,1);
 const nitrideErodedNm=overFraction*CMP_PHASES[3].minutes*CMP_RECIPE.nitrideRateNmMin;
 const endpoint=elapsed>=overStart;
 return {
  elapsed,idx,phase,local,done:elapsed>=CMP_TOTAL,
  fraction:elapsed/CMP_TOTAL,
  realMinutes:realStart+phase.minutes*local,
  platenRPM:param('platenRPM'),carrierRPM:param('carrierRPM'),
  pressurePsi:phase.key==='polish'?
   CMP_RECIPE.pressurePsi*ease(clamp((local-.10)/.10,0,1)):param('pressurePsi'),
  waferLift:phase.key==='polish'?1-ease(clamp(local/.10,0,1)):param('lift'),
  slurryMlMin:param('slurry'),conditioning:phase.condition,
  oxideRemovedNm,nitrideErodedNm,endpoint,
  removalRateNmMin:phase.key==='polish'&&local>.10?CMP_RECIPE.oxideRateNmMin:0
 };
}
