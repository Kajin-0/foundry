// Transparent source-flux approximation. Flux units: GaAs(001) group-III bilayers per second.
export const GAAS_LATTICE_NM = 0.565325;
export const ML_NM = GAAS_LATTICE_NM/2;
export const GA_ML_S = 1.0;
export const AL_ML_S = GA_ML_S*3/7; // x_Al = Al/(Ga+Al) = 0.300
export const AL_FRACTION = AL_ML_S/(GA_ML_S+AL_ML_S);
export const P_BASE = 5e-11;
export const P_GROWTH = 2e-8; // Illustrative chamber gauge, NOT As beam equivalent pressure.
export const P_AS_BEP = 7e-6; // Indicative beam-equivalent pressure at the substrate.
export const ROTATION_RPM = 20;
export const LAYER_INFO = [
 {name:'GaAs buffer',color:0xdde5ee,thick:1.0},
 {name:'Al₀.₃Ga₀.₇As lower clad',color:0xc8b8a8,thick:0.5},
 {name:'GaAs active',color:0xe8f0f8,thick:0.1},
 {name:'Al₀.₃Ga₀.₇As upper clad',color:0xc8b8a8,thick:0.5},
];
export const gaasRate = GA_ML_S;
export const alloyRate = GA_ML_S+AL_ML_S;
export function rateMLs(ga,al){return GA_ML_S*ga+AL_ML_S*al;}
export function rateUmH(mls){return mls*ML_NM*3.6;}
export function durationMin(thickUm,rate){return thickUm*1000/(rate*ML_NM*60);}
export function lerpLog(a,b,t){return Math.pow(10,Math.log10(a)+(Math.log10(b)-Math.log10(a))*Math.max(0,Math.min(1,t)));}
const bufferMin=durationMin(1,gaasRate);
const lowerMin=durationMin(0.5,alloyRate);
const activeMin=durationMin(0.1,gaasRate);
const upperMin=durationMin(0.5,alloyRate);
// Real-time growth includes brief interface-transition narration. No hidden deposition during "pauses".
export const CYCLE=[
 {dur:2.5,real:10,narr:'LOAD LOCK · N₂ vent',color:'#7fc4ff',pLock:760,subT:25,gaO:0,alO:0,asO:0,
 detail:'Wafer loaded into isolated load lock. Only the lock is vented; the growth chamber stays under UHV.'},
 {dur:2.5,real:20,narr:'LOCK PUMPING · turbo',color:'#7fc4ff',pLock:5e-7,subT:25,gaO:0,alO:0,asO:0,
 detail:'Load lock is rough-pumped and turbo-pumped before transferring the wafer.'},
 {dur:3,real:30,narr:'CELL STABILIZATION',color:'#ffaa66',subT:25,gaT:980,alT:1150,asT:320,gaO:0,alO:0,asO:0,
 detail:'Effusion cells warm and stabilize before calibrating group-III arrival rates. Temperatures are illustrative setpoints.'},
 {dur:1,real:2,narr:'BFM CALIBRATION · Ga',color:'#7fc4ff',subT:25,gaO:1,alO:0,asO:0,calibrate:true,
 detail:'With no wafer in the chamber, retractable ion gauge samples the Ga beam-equivalent pressure.'},
 {dur:1,real:2,narr:'BFM CALIBRATION · Al',color:'#7fc4ff',subT:25,gaO:0,alO:1,asO:0,calibrate:true,
 detail:'Ga closes; Al beam is measured separately. Beam-flux monitor retracts before wafer transfer.'},
 {dur:2,real:2,narr:'TRANSFER · to growth chamber',color:'#7fc4ff',pEnd:5e-10,subT:25,gaO:0,alO:0,asO:0,
 detail:'Shutters closed, BFM retracted; wafer passes through the gate valve onto the growth manipulator.'},
 {dur:3,real:30,narr:'DEGAS · 200 °C',color:'#ffaa66',pEnd:P_BASE,subT:200,gaO:0,alO:0,asO:0,
 detail:'The wafer/holder is heated gently to desorb adsorbed gases. A separate high-temperature native-oxide desorption follows.'},
 {dur:3,real:10,narr:'OXIDE DESORPTION · As flux',color:'#ffaa66',subT:610,gaO:0,alO:0,asO:1,
 detail:'At ~610 °C under As flux, native GaAs oxide desorbs. RHEED evolves from diffuse to streaky as the surface clears.'},
 {dur:2,real:5,narr:'STABILIZE · 580 °C',color:'#7ee6a0',subT:580,gaO:0,alO:0,asO:1,
 detail:'Surface stabilizes under arsenic overpressure at the epitaxial growth temperature.'},
 {dur:10,real:bufferMin,narr:'GaAs BUFFER · 1.00 µm',color:'#7ee6a0',subT:580,gaO:1,alO:0,asO:1,growthLayer:0,
 detail:'Ga + As beams form the buffer. Nominal rate 1 ML/s ≈ 1.02 µm/hr; RHEED oscillations are schematic.'},
 {dur:1,real:1,narr:'INTERFACE · Al shutter opens',color:'#7ee6a0',subT:580,gaO:1,alO:1,asO:1,growthLayer:1,
 detail:'Al shutter opens; Al/(Ga+Al)=0.30. Deposition continues during the slowed-down shutter animation.'},
 {dur:5,real:lowerMin-1,narr:'AlGaAs LOWER CLAD · 0.50 µm',color:'#7ee6a0',subT:580,gaO:1,alO:1,asO:1,growthLayer:1,
 detail:'Al₀.₃Ga₀.₇As grows at ~1.43 ML/s because Ga and Al fluxes add; time is adjusted for 0.50 µm total.'},
 {dur:1,real:1,narr:'INTERFACE · Al shutter closes',color:'#7ee6a0',subT:580,gaO:1,alO:0,asO:1,growthLayer:2,
 detail:'Al closes; growth continues directly into the GaAs active layer.'},
 {dur:3,real:activeMin-1,narr:'GaAs ACTIVE · 0.10 µm',color:'#7ee6a0',subT:580,gaO:1,alO:0,asO:1,growthLayer:2,
 detail:'Thin GaAs active region provides the lower-bandgap optical gain medium.'},
 {dur:1,real:1,narr:'INTERFACE · Al shutter opens',color:'#7ee6a0',subT:580,gaO:1,alO:1,asO:1,growthLayer:3,
 detail:'Al opens to form the upper AlGaAs cladding without an artificial deposition pause.'},
 {dur:5,real:upperMin-1,narr:'AlGaAs UPPER CLAD · 0.50 µm',color:'#7ee6a0',subT:580,gaO:1,alO:1,asO:1,growthLayer:3,
 detail:'Upper AlGaAs cladding completes. Physical total stack thickness is 2.10 µm.'},
 {dur:1.5,real:1,narr:'GROUP-III SHUTTERS CLOSE',color:'#7fc4ff',subT:580,gaO:0,alO:0,asO:1,
 detail:'Ga and Al close; arsenic remains available during early cooldown to maintain an As-rich GaAs surface.'},
 {dur:2,real:30,narr:'COOL UNDER As · 350 °C',color:'#5f7d9e',subT:350,gaO:0,alO:0,asO:1,
 detail:'Substrate cools under As flux until desorption is no longer a concern.'},
 {dur:0.6,real:1,narr:'As SHUTTER CLOSES',color:'#5f7d9e',subT:350,gaO:0,alO:0,asO:0,
 detail:'The arsenic shutter closes after initial cooldown.'},
 {dur:2,real:30,narr:'COOL DOWN · 100 °C',color:'#5f7d9e',pEnd:P_BASE,subT:100,gaT:200,alT:200,asT:200,gaO:0,alO:0,asO:0,
 detail:'Wafer cools under vacuum. Demonstration complete; do not infer an actual tool recipe.'},
];
export const TOTAL=CYCLE.reduce((s,p)=>s+p.dur,0);
export const TOTAL_REAL=CYCLE.reduce((s,p)=>s+p.real,0);
export function phaseAt(t){
 let elapsed=0;
 for(let idx=0;idx<CYCLE.length;idx++){
  const phase=CYCLE[idx], end=elapsed+phase.dur;
  if(t<end||idx===CYCLE.length-1)return {idx,phase,local:Math.max(0,Math.min(1,(t-elapsed)/phase.dur))};
  elapsed=end;
 }
 throw new Error('Unreachable phase');
}
// Single source of truth for thickness, ML counter, cross-section, and 3D geometry.
export function layerThicknessUmAt(t){
 const thickness=LAYER_INFO.map(()=>0);
 let elapsed=0;
 for(const p of CYCLE){
  const fraction=Math.max(0,Math.min(1,(t-elapsed)/p.dur));
  if(p.growthLayer!==undefined)
   thickness[p.growthLayer]+=p.real*60*rateMLs(p.gaO,p.alO)*ML_NM/1000*fraction;
  elapsed+=p.dur;
 }
 return thickness.map((v,i)=>Math.min(LAYER_INFO[i].thick,Math.max(0,v)));
}
export function previousSetpoint(idx,key,initial=200){
 for(let i=idx-1;i>=0;i--)if(CYCLE[i][key]!==undefined)return CYCLE[i][key];
 return initial;
}
