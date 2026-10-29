/* ============ ION MILL CYCLE ============ */
/* Ion-beam-etch model. Etch rate = Y(θ)·J/(e·n). Parameters are illustrative, not vendor data. */
const IBE = { J: 0.5e-3, Y0: 1.8, n: 4.42e22, f: 2.0, thOpt: 70, resistT: 1.5, sel: 1.5, tilt: 30, depth: 0.40, UPPER: 0.5, ACTIVE: 0.1 };
function ibeRate(tiltDeg) {                       /* nm/min, GaAs/AlGaAs */
  const th = tiltDeg * Math.PI / 180, c = Math.cos(th), co = Math.cos(IBE.thOpt * Math.PI / 180);
  const yRatio = Math.pow(c, -IBE.f) * Math.exp(IBE.f * co * (1 - 1 / c));   /* Yamamura angular form */
  return IBE.Y0 * yRatio * c * IBE.J / 1.602e-19 / IBE.n * 1e7 * 60;       /* cm/s → nm/min */
}
const millMin = () => IBE.depth * 1000 / ibeRate(IBE.tilt);

const P_BASE = 5e-6, P_WORK = 2e-4;
const P_PREP = 5e-5; // Representative post-transfer vacuum, before final stabilization.

/*
 * The chip is mechanically clamped on the cooled stage BEFORE the visual
 * cycle starts. Actual loading, load-lock pumping and robotic transfer take
 * place offscreen; they are not depicted as unsupported floating motion.
 * Illustrative preset recipe: no user-adjustable beam/tilt/depth controls.
 */
const IMM_CYCLE = [
  {dur:2,real:1,narr:'READY · wafer already clamped',color:'#7fc4ff',cP:[P_PREP,P_PREP],tB:0,tS:25,
    detail:'The chip has already been transferred through the load lock and clamped to the water-cooled stage. The transfer mechanism is outside this cutaway.'},
  {dur:3,real:5,narr:'PUMPING · chamber stabilizes',color:'#7fc4ff',cP:[P_PREP,P_BASE],tB:0,tS:25,
    detail:'The closed chamber stabilizes from 5×10⁻⁵ to 5×10⁻⁶ Torr. The wafer stays mechanically seated on its stage.'},
  {dur:2,real:1,narr:'ARGON · source gas admitted',color:'#7fc4ff',cP:[P_BASE,P_WORK],tB:0,tS:25,
    detail:'Argon is admitted. The example working pressure is 2×10⁻⁴ Torr; the ion beam remains blocked by its shutter.'},
  {dur:3,real:5,narr:'ION SOURCE · shutter closed',color:'#ffaa66',cP:[P_WORK,P_WORK],tB:0.5,tS:25,hot:true,
    detail:'The Kaufman source and neutralizer start. A nominal 500 eV Ar⁺ beam is stabilized behind the closed shutter.'},
  {dur:2,real:3,narr:'STAGE TILTS · preset 30°',color:'#ffaa66',cP:[P_WORK,P_WORK],tB:0.5,tS:25,hot:true,tilt:true,
    detail:'The water-cooled wafer stage tilts to its preset 30° incidence angle while the source shutter remains closed.'},
  {dur:10,real:0,narr:'MILLING · 500 eV Ar⁺',color:'#7ee6a0',etch:true,cP:[P_WORK,P_WORK],tB:0.5,tS:40,hot:true,open:true,tilt:true,
    detail:()=>`The shutter opens; Ar⁺ removes exposed GaAs/AlGaAs by sputtering while the masked ridge remains. Rate ≈ ${ibeRate(IBE.tilt).toFixed(0)} nm/min; preset depth ${IBE.depth.toFixed(2)} µm in ≈ ${millMin().toFixed(1)} min. The stage rotates at 14 rpm.`},
  {dur:2,real:1,narr:'SHUTTER CLOSES · source off',color:'#7fc4ff',cP:[P_WORK,P_BASE],tB:0,tS:30,tiltOut:true,
    detail:'Shutter closes before the source is switched off. Argon flow stops and the stage returns to level.'},
  {dur:2,real:2,narr:'COMPLETE · wafer remains mounted',color:'#7ee6a0',cP:[P_BASE,P_BASE],tB:0,tS:25,
    detail:()=>`Etched ${IBE.depth.toFixed(2)} µm. ${(IBE.UPPER-IBE.depth).toFixed(2)} µm of upper cladding remains above the active layer. The wafer stays clamped for inspection; actual unload occurs through the load lock offscreen.`},
];
const IMM_TOTAL = IMM_CYCLE.reduce((s, p) => s + p.dur, 0);
const IMM_MILL = IMM_CYCLE.findIndex(p => p.etch);
function fmtP(p) { return p > 1 ? `${Math.round(p)} Torr` : p > 1e-3 ? `${(p * 1000).toFixed(1)} mTorr` : `${p.toExponential(1)} Torr`; }
const imRealMin = (i) => IMM_CYCLE[i].etch ? millMin() : IMM_CYCLE[i].real;

/* log-interpolate between pressures */
function lerpLog(a, b, t) {
  if (a <= 0 || b <= 0) return a + (b - a) * t;
  const la = Math.log10(a), lb = Math.log10(b);
  return Math.pow(10, la + (lb - la) * t);
}

/* two-stage pump-down: roughing (760 → 0.1 in 30% of phase) then turbo */
function pumpCurve(t) {
  if (t < 0.30) {
    return lerpLog(760, 0.1, t / 0.30);
  } else {
    return lerpLog(0.1, 5e-6, (t - 0.30) / 0.70);
  }
}


export {IBE,ibeRate,millMin,P_BASE,P_WORK,IMM_CYCLE,IMM_TOTAL,IMM_MILL,fmtP,imRealMin,lerpLog,pumpCurve};
