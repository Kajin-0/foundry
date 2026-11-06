// Spin-coating model ported from the supplied standalone source.
// Emslie flow + simplified Meyerhofer evaporation; deliberately uncalibrated.
const SIM = { total: 40, speed: 3 };
const proc = { running: false, simTime: 0, phase: "idle", rpm: 0, thickness: 0, dispensed: false };

const RHO = 1100;              // kg/m³
const ETA = 0.005;             // Pa·s (5 cP)
const E   = 25e-9;             // m/s (25 nm/s) — calibration for h_final ≈ 1 µm at 3000 rpm
const H_FLOOR = 1.0;           // µm — practical floor (viscosity rise stalls flow)

function rpmAt(t) {
  if (t < 2) return 0;
  if (t < 2.6) return ((t - 2) / 0.6) * 500;
  if (t < 6.5) return 500;
  if (t < 7.2) return 500 + ((t - 6.5) / 0.7) * 2500;
  if (t < 36) return 3000;
  if (t < 40) return 3000 - ((t - 36) / 4) * 3000;
  return 0;
}

/* Precompute thickness array by integrating the coupled ODE.
   Units: h stored in µm. */
const DT_PRECOMP = 0.02;
const PRECOMP = { arr: null, n: 0 };

function precomputeThickness() {
  const n = Math.ceil(SIM.total / DT_PRECOMP) + 1;
  const arr = new Float32Array(n);
  const iStart = Math.ceil(2.0 / DT_PRECOMP);

  // Dispense phase (0 to 2 s)
  for (let i = 0; i <= iStart && i < n; i++) {
    const t = i * DT_PRECOMP;
    if (t < 1.0) arr[i] = 0;
    else arr[i] = 100 * (t - 1.0);
  }
  arr[iStart] = 100;

  // Integrate ODE for t > 2
  let h = 100;
  for (let i = iStart + 1; i < n; i++) {
    const t = i * DT_PRECOMP;
    const rpm = rpmAt(t);
    const omega = rpm * 2 * Math.PI / 60;
    const K = 2 * RHO * omega * omega / (3 * ETA);
    const h_m = h * 1e-6;
    const dh = (-K * h_m * h_m * h_m - E) * DT_PRECOMP;
    h = Math.max(H_FLOOR, h + dh * 1e6);
    arr[i] = h;
  }

  PRECOMP.arr = arr;
  PRECOMP.n = n;
}

function thicknessAt(t) {
  if (!PRECOMP.arr) return 0;
  if (t <= 0) return 0;
  if (t >= SIM.total) return PRECOMP.arr[PRECOMP.n - 1];
  const f = t / DT_PRECOMP;
  const i0 = Math.floor(f);
  const i1 = Math.min(i0 + 1, PRECOMP.n - 1);
  const frac = f - i0;
  return PRECOMP.arr[i0] * (1 - frac) + PRECOMP.arr[i1] * frac;
}

function phaseAt(t) {
  if (t < 2) return "dispense";
  if (t < 7) return "flow";
  if (t < 27) return "thin";
  if (t < 36) return "evap";
  return "dry";
}
function phaseLabel(p) {
  return { dispense: "DISPENSE", flow: "FLOW", thin: "THIN",
           evap: "EVAP", dry: "DRY", done: "COMPLETE", idle: "IDLE" }[p] || "IDLE";
}
function narrDetail(p) {
  return {
    dispense: "Dispense arm over wafer · resist droplet falling.",
    flow:     "Centrifugal flow at 500 rpm — film thinning rapidly (Emslie).",
    thin:     "At 3000 rpm — flow and evaporation both active; film approaching equilibrium.",
    evap:     "Evaporation dominates — solvent leaving, viscosity rising (Meyerhofer).",
    dry:      "Spin-down · final solvent removal from the film.",
    done:     "Spin cycle complete. Final film at target thickness.",
    idle:     "Press Run to spin-coat an illustrative photoresist film on a Si wafer."
  }[p];
}

/* ── FILM-STATE HELPERS ───────────────────────────────────── */
function spreadRadiusAt(t) {
  if (t < 0.95) return 0;
  if (t < 1.6) return 0.32 * ((t - 0.95) / 0.65);
  if (t < 3.6) return 0.32 + 0.78 * ((t - 1.6) / 2.0);
  return 1.10;
}
function visualHeightAt(thickness) {
  if (thickness <= 0) return 0.0002;
  const norm = Math.min(1, thickness / 100);
  return 0.002 + Math.pow(norm, 0.55) * 0.042;
}
function wetnessAt(t) {
  if (t < 7)  return 1.0;
  if (t < 27) return 1.0  - 0.55 * ((t - 7)  / 20);  // 1.00 → 0.45
  if (t < 36) return 0.45 - 0.20 * ((t - 27) / 9);   // 0.45 → 0.25
  if (t < 40) return 0.25 - 0.10 * ((t - 36) / 4);   // 0.25 → 0.15
  return 0.15;
}

function formatThickness(h_um) {
  if (h_um <= 0) return "—";
  if (h_um < 1) return Math.round(h_um * 1000) + " nm";
  return h_um.toFixed(2) + " µm";
}


export function createSpinController(model){
 precomputeThickness();
 const $=id=>document.getElementById('spin'+id);
 const play=$('PlayBtn'),cut=$('Cut'),curve=$('Curve'),xsec=$('Xsec');
 let uiAccum=.11,drawAt=0;
 const W=300,H=76;
 const samples=Array.from({length:161},(_,i)=>{
  const t=i*SIM.total/160,h=Math.max(.1,thicknessAt(t));
  return [12+i*280/160,66-(Math.log10(h)+1)/3*52];
 });
 curve.innerHTML='<line x1="12" y1="66" x2="295" y2="66" stroke="#476381" stroke-width=".8"/>'+
  '<line x1="12" y1="10" x2="12" y2="66" stroke="#476381" stroke-width=".8"/>'+
  '<path d="'+samples.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+','+y.toFixed(1)).join(' ')+'" fill="none" stroke="#7fc4ff" stroke-width="1.7"/>'+
  '<line id="spinCursor" x1="12" y1="10" x2="12" y2="66" stroke="#ffc36d" stroke-width="1.2" stroke-dasharray="2 2"/>'+
  '<text x="15" y="9" fill="#9cb6ce" font-size="8">100 µm</text>'+
  '<text x="295" y="74" text-anchor="end" fill="#7794b3" font-size="8">40 s</text>';
 const cursor=document.getElementById('spinCursor');
 function paint(){
  const t=proc.simTime,h=proc.thickness;
  $('Status').textContent=phaseLabel(proc.phase);
  $('Detail').textContent=narrDetail(proc.phase);
  $('Time').textContent=t.toFixed(1)+' / '+SIM.total+' s (illustrative time)';
  $('Progress').style.width=(t/SIM.total*100).toFixed(1)+'%';
  $('V1').textContent=Math.round(proc.rpm)+' rpm';
  $('V2').textContent=proc.running?'On':'Off';
  $('V3').textContent=proc.dispensed?'Dispensed':'Waiting';
  $('V4').textContent=proc.phase==='evap'||proc.phase==='dry'?'Dominant':proc.phase==='thin'?'Active':'—';
  $('V5').textContent=formatThickness(h);
  $('V6').textContent=t.toFixed(1)+' s';
  $('FilmThickness').textContent=formatThickness(h);
  cursor.setAttribute('x1',(12+280*t/SIM.total).toFixed(1));
  cursor.setAttribute('x2',(12+280*t/SIM.total).toFixed(1));
  const visual=Math.max(0,Math.min(1,Math.log10(Math.max(.1,h)/.1)/3));
  const top=25+(1-visual)*22;
  xsec.innerHTML='<rect x="0" y="47" width="300" height="45" fill="#485f73"/>'+
   '<rect x="0" y="'+top.toFixed(1)+'" width="300" height="'+Math.max(0,47-top).toFixed(1)+'" fill="#dca85a" fill-opacity=".78"/>'+
   '<text x="7" y="59" font-size="9" fill="#d5e9fa">Si (100) · 525 µm</text>'+
   '<text x="7" y="19" font-size="9" fill="#a6c8e8">CAR photoresist · '+(h?formatThickness(h):'not dispensed')+'</text>';
  if(proc.running){play.textContent='■ Stop Spin';play.classList.add('running');play.classList.remove('done')}
  else {play.textContent=proc.phase==='done'?'✓ Spin Complete':'▶ Run Spin Cycle';
   play.classList.remove('running');play.classList.toggle('done',proc.phase==='done')}
 }
 function start(){
  if(proc.running){proc.running=false;proc.rpm=0;proc.phase='idle';paint();return}
  proc.running=true;proc.simTime=0;proc.phase='dispense';proc.rpm=0;proc.thickness=0;proc.dispensed=false;
  model.setVisual(proc,0,0);paint();
 }
 play.addEventListener('click',start);
 cut.addEventListener('input',()=>model.setCut(Number(cut.value)/100));
 model.setCut(Number(cut.value)/100);
 function update(dt,time,visible){
  if(proc.running){
   proc.simTime=Math.min(SIM.total,proc.simTime+Math.max(0,dt)*SIM.speed);
   proc.phase=proc.simTime>=SIM.total?'done':phaseAt(proc.simTime);
   proc.rpm=proc.phase==='done'?0:rpmAt(proc.simTime);
   proc.thickness=thicknessAt(proc.simTime);proc.dispensed=proc.simTime>=1;
   if(proc.phase==='done')proc.running=false;
  }
  if(visible){
   model.setVisual(proc,dt,time);
   uiAccum+=dt;
   if(uiAccum>=.1||!proc.running){paint();uiAccum=0}
  }
 }
 paint();model.setVisual(proc,0,0);
 return {group:model.group,update,refresh:paint,isRunning:()=>proc.running,
  getState:()=>({...proc}),renderOptimization:model.staticStats};
}
