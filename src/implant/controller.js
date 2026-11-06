// Adapted from the supplied implanter. Preset Si dopant profiles are
// educational LSS-type approximations, not SRIM or calibrated implantation.
const IONS = {
  As: { name: "Arsenic", symbol: "As⁺", mass: 75, color: 0xff7a2a,
        Rp_ref: 0.058, dRp_ref: 0.019, E_ref: 100,
        rangeExp: 0.72, dRpExp: 0.55, skew: 1.00,
        dmgPeak: 0.72, vacPerIon: 1000,
        psi_c_ref: 4.5, fmax: 0.35, amorphDose: 3e14 },
  B:  { name: "Boron", symbol: "B⁺", mass: 11, color: 0x7ee6a0,
        Rp_ref: 0.160, dRp_ref: 0.058, E_ref: 50,
        rangeExp: 0.85, dRpExp: 0.65, skew: 0.65,
        dmgPeak: 0.88, vacPerIon: 100,
        psi_c_ref: 6.0, fmax: 0.25, amorphDose: 1e16 },
  P:  { name: "Phosphorus", symbol: "P⁺", mass: 31, color: 0xc08aff,
        Rp_ref: 0.135, dRp_ref: 0.052, E_ref: 100,
        rangeExp: 0.90, dRpExp: 0.65, skew: 0.85,
        dmgPeak: 0.78, vacPerIon: 800,
        psi_c_ref: 4.0, fmax: 0.30, amorphDose: 1e15 }
};

/* ψc reference values (per-ion, at E_ref), scaled by √(E_ref/E):
   Experimental critical angles in Si(100):  B (50 keV) ≈ 5-6°,  P (100 keV) ≈ 3.5-4°,
   As (100 keV) ≈ 4-5°. Lighter ions have a WIDER channel acceptance, so ψc decreases
   with Z₁ — the opposite of the "√Z₁" LINDHARD form which ignores thermal vibration
   and dechanneling differences between species. */
const PRESETS = {
  sd:   { ion: "As", E: 100, dose: 5e15, tilt: 7, current_uA: 100 },
  bsd:  { ion: "B",  E: 50,  dose: 1e15, tilt: 7, current_uA: 50  },
  well: { ion: "P",  E: 300, dose: 1e13, tilt: 7, current_uA: 200 }
};

const Q_E = 1.602e-19;
const WAFER_AREA_CM2 = Math.PI * 25;
const T_MAX_WAFER = 120;
const TAU_REAL = 27;         // s (C_wafer/R_th with C=6.8 J/K, R=4 K/W)
const MIN_IMPLANT_TIME = 10; // s (scan uniformity floor)
const DMG_CAP = 5e22;        // cm⁻³ ≈ 1 DPA in Si

function rangeFor(ionKey, E_keV) {
  const ion = IONS[ionKey];
  return {
    Rp:  ion.Rp_ref  * Math.pow(E_keV / ion.E_ref, ion.rangeExp),
    dRp: ion.dRp_ref * Math.pow(E_keV / ion.E_ref, ion.dRpExp)
  };
}
function criticalAngle(ionKey, E_keV) {
  return IONS[ionKey].psi_c_ref * Math.sqrt(IONS[ionKey].E_ref / E_keV);
}
function peakConcentration(dose_cm2, dRp_um) {
  return dose_cm2 / (Math.sqrt(2 * Math.PI) * dRp_um * 1e-4);
}
function doseRatePerUA() {
  return 1e-6 / (Q_E * WAFER_AREA_CM2);  // cm⁻²·s⁻¹ per µA
}
/* Effective current = min(thermal limit, scan-uniformity limit). */
function effectiveCurrent(current_uA, E_keV, targetDose_cm2) {
  const T_ss_nom = 25 + 4 * current_uA * E_keV * 1e-3;
  const thermalCap = T_ss_nom <= T_MAX_WAFER ? current_uA
    : (T_MAX_WAFER - 25) / (4 * E_keV * 1e-3);
  const scanCap = targetDose_cm2 / (MIN_IMPLANT_TIME * doseRatePerUA());
  return Math.min(current_uA, thermalCap, scanCap);
}

/* Dose-conserving asymmetric Gaussian + history-aware channeling tail.
   - Asymmetric Gaussian split at mode x₀.  Mode is offset from mean Rp by
     -(sR - sL)·√(2/π) so that the profile mean equals the tabulated Rp.
   - Channeling tail: exponential from Rp to +∞ with Gaussian rise on the
     surface side (σ_rise = 0.4·ΔRp).  Amplitude normalized so the channeled
     dose equals the analytically integrated f_tail(D)·D_amorph. */
function concentration(x_um, dose_cm2, tilt_deg) {
  if (dose_cm2 <= 0) return 0;
  const ion = IONS[proc.ion];
  const { Rp, dRp } = rangeFor(proc.ion, proc.E);
  const psi_c = criticalAngle(proc.ion, proc.E);

  const fmax_tilt = ion.fmax / (1 + Math.pow(tilt_deg / psi_c, 2));
  const D_am = ion.amorphDose;
  const D_ch_cm2 = fmax_tilt * D_am * (1 - Math.exp(-dose_cm2 / D_am));
  const D_random_cm2 = dose_cm2 - D_ch_cm2;

  // Asymmetric Gaussian (positive skew — surface narrower, deep wider)
  const sL_um = dRp * ion.skew;
  const sR_um = dRp * (2 - ion.skew);
  const sL_cm = sL_um * 1e-4;
  const sR_cm = sR_um * 1e-4;
  const modeShift = -(sR_um - sL_um) * Math.sqrt(2 / Math.PI);
  const x0 = Rp + modeShift;
  const Nm_rand = D_random_cm2 / ((sL_cm + sR_cm) * Math.sqrt(Math.PI / 2));

  let g = 0;
  if (x_um < x0) {
    const z = (x_um - x0) / sL_um;
    g = Nm_rand * Math.exp(-0.5 * z * z);
  } else {
    const z = (x_um - x0) / sR_um;
    g = Nm_rand * Math.exp(-0.5 * z * z);
  }

  // Channeling tail (smooth rise on surface side, exponential decay deeper)
  let ch = 0;
  if (D_ch_cm2 > 0) {
    const L_ch_um = 2.0 * Rp;
    const L_rise_um = 0.4 * dRp;
    const A = D_ch_cm2 * 1e-4 / (L_ch_um + L_rise_um * Math.sqrt(2 * Math.PI) * 0.5);
    if (x_um >= Rp) {
      ch = A * Math.exp(-(x_um - Rp) / L_ch_um);
    } else {
      const zr = (x_um - Rp) / L_rise_um;
      ch = A * Math.exp(-0.5 * zr * zr);
    }
  }
  return g + ch;
}

function damageProfile(x_um, dose_cm2) {
  if (dose_cm2 <= 0) return 0;
  const ion = IONS[proc.ion];
  const { Rp, dRp } = rangeFor(proc.ion, proc.E);
  const Rp_d = ion.dmgPeak * Rp;
  const dRp_d = 1.40 * dRp;
  const dRp_d_cm = dRp_d * 1e-4;
  const Np_d = dose_cm2 * ion.vacPerIon / (Math.sqrt(2 * Math.PI) * dRp_d_cm);
  const z = (x_um - Rp_d) / dRp_d;
  return Math.min(DMG_CAP, Np_d * Math.exp(-0.5 * z * z));
}

const SIM = { total: 35, speed: 3 };
const T_TUNE = 3, T_IMPLANT_START = 3, T_IMPLANT_END = 30, T_COOL = 30, T_END = 35;
const SIM_IMPLANT_SEC = T_IMPLANT_END - T_IMPLANT_START;

const proc = {
  running: false, simTime: 0, phase: "idle",
  ion: "As", E: 100, targetDose: 5e15, tilt: 7, currentMax_uA: 100,
  effectiveCurrent_uA: 100,
  dose: 0, beamCurrent_uA: 0, waferTemp: 25,
  realImplantSeconds: 625,
  timeCompression: 23
};

function phaseAt(t) {
  if (t < T_TUNE) return "tune";
  if (t < T_IMPLANT_END) return "implant";
  if (t < T_END) return "cool";
  return "done";
}
function phaseLabel(p) {
  return { tune: "TUNE", implant: "IMPLANT", cool: "COOL", done: "COMPLETE", idle: "IDLE" }[p] || "IDLE";
}
function narrDetail(p) {
  const ion = IONS[proc.ion];
  return {
    tune:    "Mass analyzer tuning " + ion.symbol + " · beam deflected to Faraday cup (wafer safe).",
    implant: "Shutter open · " + ion.symbol + " implanting at " + proc.E + " keV.",
    cool:    "Shutter closed · wafer cooling passively · beamline idles.",
    done:    "Cycle complete. Wafer ready for post-implant anneal.",
    idle:    "Press Run to implant " + ion.symbol + " at " + proc.E + " keV into a Si wafer."
  }[p];
}
function doseAt(t) {
  if (t < T_IMPLANT_START) return 0;
  if (t >= T_IMPLANT_END) return proc.targetDose;
  return proc.targetDose * (t - T_IMPLANT_START) / SIM_IMPLANT_SEC;
}
function beamCurrentAt(t) {
  if (t < T_TUNE) return (t / T_TUNE) * proc.effectiveCurrent_uA;
  if (t < T_IMPLANT_END) return proc.effectiveCurrent_uA;
  return 0;
}
function steadyStateTemp(current_uA, E_keV) {
  return 25 + 4 * current_uA * E_keV * 1e-3;
}

function toSuperscript(n) {
  const map = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻' };
  return String(n).split('').map(c => map[c] || c).join('');
}
function formatDose(d) {
  if (d <= 0) return "0";
  const exp = Math.floor(Math.log10(d));
  const mant = d / Math.pow(10, exp);
  return mant.toFixed(1) + "×10" + toSuperscript(exp);
}
function formatConc(n) {
  if (n < 1e14) return "—";
  const exp = Math.floor(Math.log10(n));
  const mant = n / Math.pow(10, exp);
  return mant.toFixed(1) + "×10" + toSuperscript(exp);
}
function formatDuration(s) {
  if (s < 1) return s.toFixed(2) + " s";
  if (s < 60) return s.toFixed(0) + " s";
  if (s < 3600) return (s / 60).toFixed(1) + " min";
  return (s / 3600).toFixed(1) + " h";
}


export function createImplantController(model){
 const $=id=>document.getElementById('implant'+id);
 const play=$('PlayBtn'),cut=$('Cut'),chart=$('Profile'),xsec=$('Xsec');
 let uiAccum=.11;
 function preset(key){
  if(proc.running||!PRESETS[key])return;
  const p=PRESETS[key];
  proc.ion=p.ion;proc.E=p.E;proc.targetDose=p.dose;
  proc.tilt=p.tilt;proc.currentMax_uA=p.current_uA;
  proc.effectiveCurrent_uA=effectiveCurrent(p.current_uA,p.E,p.dose);
  proc.realImplantSeconds=p.dose/(proc.effectiveCurrent_uA*doseRatePerUA());
  proc.timeCompression=proc.realImplantSeconds/SIM_IMPLANT_SEC;
  proc.running=false;proc.phase='idle';proc.simTime=0;
  proc.dose=0;proc.waferTemp=25;proc.beamCurrent_uA=0;
  document.querySelectorAll('[data-implant-preset]').forEach(b=>b.classList.toggle('active',b.dataset.implantPreset===key));
  document.querySelectorAll('[data-implant-tilt]').forEach(b=>b.classList.toggle('active',Number(b.dataset.implantTilt)===proc.tilt));
  refresh();
 }
 function profile(){
  const {Rp,dRp}=rangeFor(proc.ion,proc.E);
  const maxX=Math.max(.52,Rp+5*dRp),n=130;
  const geom=(fn,dose)=>Array.from({length:n+1},(_,i)=>{
   const d=i/n*maxX;
   const N=fn(d,dose);
   const yy=Math.max(0,Math.min(1,(Math.log10(Math.max(1e15,N))-15)/8));
   return (i?'L':'M')+(17+274*i/n).toFixed(1)+','+(75-57*yy).toFixed(1);
  }).join(' ');
  chart.innerHTML='<line x1="17" y1="75" x2="292" y2="75" stroke="#526882"/>'+
   '<line x1="17" y1="12" x2="17" y2="75" stroke="#526882"/>'+
   '<text x="19" y="10" fill="#a5b9cf" font-size="8">log₁₀ N [cm⁻³]</text>'+
   '<text x="290" y="88" text-anchor="end" fill="#7fa8cf" font-size="8">'+maxX.toFixed(2)+' µm</text>'+
   '<path d="'+geom((d,dose)=>damageProfile(d,dose),proc.dose)+'" fill="none" stroke="#a06060" stroke-width="1.3" stroke-dasharray="3 2"/>'+
   '<path d="'+geom((d,dose)=>concentration(d,dose,proc.tilt),proc.dose)+'" fill="none" stroke="#ff9a4a" stroke-width="1.7"/>';
  const center=Rp/maxX*274+17,band=Math.min(30,dRp/maxX*274);
  xsec.innerHTML='<rect y="15" x="0" width="300" height="77" fill="#52677a"/>'+
   '<rect y="15" x="0" width="300" height="16" fill="#d37934" fill-opacity="'+Math.min(.65,Math.max(0,proc.dose/proc.targetDose)*.65).toFixed(2)+'"/>'+
   '<text x="8" y="54" fill="#e1f0fb" font-size="9">Si substrate · dopant projected range '+Math.round(Rp*1000)+' nm</text>'+
   '<text x="8" y="11" fill="#acbbcb" font-size="9">Schematic dopant / displacement region</text>';
 }
 function refresh(){
  const ion=IONS[proc.ion],range=rangeFor(proc.ion,proc.E);
  $('Status').textContent=phaseLabel(proc.phase);
  $('Detail').textContent=narrDetail(proc.phase);
  $('Time').textContent=proc.simTime.toFixed(1)+' / '+SIM.total+' s · real implant ~'+formatDuration(proc.realImplantSeconds);
  $('Progress').style.width=(proc.simTime/SIM.total*100).toFixed(1)+'%';
  $('Ion').textContent=ion.symbol+' · '+ion.name;
  $('Energy').textContent=proc.E+' keV';
  $('Dose').textContent=formatDose(proc.targetDose)+' cm⁻²';
  $('Tilt').textContent=proc.tilt+'° / '+(proc.tilt?'22°':'0°');
  $('Rp').textContent=Math.round(range.Rp*1000)+' nm';
  $('DeltaRp').textContent=Math.round(range.dRp*1000)+' nm';
  $('Peak').textContent=formatConc(peakConcentration(proc.targetDose,range.dRp))+' cm⁻³';
  $('Current').textContent=proc.effectiveCurrent_uA.toFixed(0)+' µA';
  $('Duration').textContent=formatDuration(proc.realImplantSeconds);
  $('V1').textContent=proc.beamCurrent_uA.toFixed(1)+' µA';
  $('V2').textContent=proc.running?'5×10⁻⁷ Torr':'—';
  $('V3').textContent=proc.waferTemp.toFixed(1)+' °C';
  $('V4').textContent=formatDose(proc.dose)+' cm⁻²';
  $('V5').textContent=proc.dose>1e12?formatConc(peakConcentration(proc.dose,range.dRp))+' cm⁻³':'—';
  $('V6').textContent=proc.simTime.toFixed(1)+' s';
  profile();
  play.textContent=proc.running?'■ Stop Implant':proc.phase==='done'?'✓ Implant Complete':'▶ Run Implant';
  play.classList.toggle('running',proc.running);
  play.classList.toggle('done',proc.phase==='done');
 }
 play.addEventListener('click',()=>{
  if(proc.running){proc.running=false;proc.phase='idle';proc.beamCurrent_uA=0;refresh();return}
  proc.running=true;proc.simTime=0;proc.phase='tune';proc.dose=0;
  proc.beamCurrent_uA=0;proc.waferTemp=25;refresh();
 });
 document.querySelectorAll('[data-implant-preset]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.implantPreset)));
 document.querySelectorAll('[data-implant-tilt]').forEach(b=>b.addEventListener('click',()=>{
  if(proc.running)return;
  proc.tilt=Number(b.dataset.implantTilt);
  document.querySelectorAll('[data-implant-tilt]').forEach(el=>el.classList.toggle('active',el===b));
  refresh();
 }));
 cut.addEventListener('input',()=>model.setCut(Number(cut.value)/100));
 model.setCut(Number(cut.value)/100);
 function update(dt,time,visible){
  if(proc.running){
   const delta=Math.max(0,dt)*SIM.speed;
   proc.simTime=Math.min(SIM.total,proc.simTime+delta);
   proc.phase=phaseAt(proc.simTime);
   proc.dose=doseAt(proc.simTime);
   proc.beamCurrent_uA=beamCurrentAt(proc.simTime);
   const tau=TAU_REAL/Math.max(.01,proc.timeCompression);
   if(proc.phase==='implant')proc.waferTemp+=(Math.min(steadyStateTemp(proc.effectiveCurrent_uA,proc.E),T_MAX_WAFER)-proc.waferTemp)*Math.min(1,delta/tau);
   else if(proc.phase==='cool')proc.waferTemp=Math.max(25,proc.waferTemp-12*delta);
   if(proc.simTime>=SIM.total){proc.running=false;proc.phase='done';proc.beamCurrent_uA=0;}
  }
  if(visible){model.setVisual(proc,dt,time);uiAccum+=dt;if(uiAccum>=.1||!proc.running){refresh();uiAccum=0}}
 }
 preset('sd');model.setVisual(proc,0,0);
 return {group:model.group,update,refresh,isRunning:()=>proc.running,
  getState:()=>({...proc}),renderOptimization:model.staticStats};
}
