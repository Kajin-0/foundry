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
const IMM_CYCLE = [
  { dur: 3, real: 2, narr: 'LOAD · lock vented with N₂', color: '#7fc4ff', lP: [760, 760], cP: [P_BASE, P_BASE], tB: 0, tS: 25,
    detail: 'Only the load-lock is vented; the main chamber stays at base pressure. Chip clamped on the carrier, lock closed.' },
  { dur: 4, real: 8, narr: 'PUMPING · lock roughing → turbo', color: '#7fc4ff', pump: true, cP: [P_BASE, P_BASE], tB: 0, tS: 25,
    detail: 'Lock roughed to ~0.1 Torr, then turbo to ~5×10⁻⁶ Torr — high vacuum (UHV is below 10⁻⁹ Torr).' },
  { dur: 3, real: 1, narr: 'TRANSFER · gate valve open', color: '#7fc4ff', xfer: true, lP: [P_BASE, P_BASE], cP: [P_BASE, P_BASE], tB: 0, tS: 25,
    detail: 'Gate valve opens, the chip is carried onto the water-cooled stage, the gate closes.' },
  { dur: 2, real: 1, narr: 'Ar FLOW · 5 sccm', color: '#7fc4ff', cP: [P_BASE, P_WORK], tB: 0, tS: 25,
    detail: 'Argon admitted to the source. Working pressure 2×10⁻⁴ Torr ≈ 3×10⁻⁷ of an atmosphere.' },
  { dur: 3, real: 5, narr: 'SOURCE ON · shutter CLOSED', color: '#ffaa66', cP: [P_WORK, P_WORK], tB: 0.5, tS: 25, hot: true,
    detail: 'Cathode filament and neutraliser heat, discharge ignites, beam ramps to 500 eV / 0.5 mA/cm² onto the closed shutter. The neutraliser stops the wafer charging.' },
  { dur: 2, real: 3, narr: 'STABILISE · tilt set, shutter CLOSED', color: '#ffaa66', cP: [P_WORK, P_WORK], tB: 0.5, tS: 25, hot: true, tilt: true,
    detail: 'Stage tilts to the set angle and the beam current settles before any ions reach the sample.' },
  { dur: 10, real: 0, narr: 'MILLING · Ar⁺ 500 eV', color: '#7ee6a0', etch: true, cP: [P_WORK, P_WORK], tB: 0.5, tS: 40, hot: true, open: true, tilt: true,
    detail: () => `Shutter open. Stage tilted ${IBE.tilt}° and rotating (14 rpm). Rate ≈ ${ibeRate(IBE.tilt).toFixed(0)} nm/min (Y·J/e·n model) → ${IBE.depth.toFixed(2)} µm in ≈ ${millMin().toFixed(1)} min. Resist at ${IBE.sel}:1 selectivity loses ≈ ${(IBE.depth / IBE.sel).toFixed(2)} µm.` },
  { dur: 2, real: 1, narr: 'SHUTTER CLOSED · beam off', color: '#7fc4ff', cP: [P_WORK, P_BASE], tB: 0, tS: 30, tiltOut: true,
    detail: 'Shutter closes first, then the beam and Ar flow stop. Tilt returns to zero.' },
  { dur: 3, real: 4, narr: 'UNLOAD · lock vent', color: '#7fc4ff', lP: [P_BASE, 760], cP: [P_BASE, P_BASE], tB: 0, tS: 25,
    detail: () => { const r = IBE.UPPER - IBE.depth; const st = r > 0.05 ? `${r.toFixed(2)} µm of cladding left above the active layer — good.` : r > 0 ? `Only ${r.toFixed(2)} µm left above the active layer — risk of ion damage.` : `ETCHED INTO THE ACTIVE LAYER (${(-r).toFixed(2)} µm past the cladding) — device ruined.`; return `${st} The chip stays on the stage here for inspection; a real tool returns it through the lock. Next: resist strip (acetone + O₂ plasma; ion-hardened resist is hard to remove).`; } },
];
const IMM_TOTAL = IMM_CYCLE.reduce((s, p) => s + p.dur, 0);
const IMM_MILL = IMM_CYCLE.findIndex(p => p.etch), IMM_XFER = IMM_CYCLE.findIndex(p => p.xfer);
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


export {IBE,ibeRate,millMin,P_BASE,P_WORK,IMM_CYCLE,IMM_TOTAL,IMM_MILL,IMM_XFER,fmtP,imRealMin,lerpLog,pumpCurve};
