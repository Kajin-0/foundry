import {PARK_X,UNLOAD_X} from '../config/geometry.js';
/* ============ LPE CYCLE ============ */
const P0 = 0.88, P1 = 0.44, P2 = 0.00, P3 = -0.44, P4 = -0.88;

const CYCLE = [
  { name: 'Heat-up', realMin: 60, animSec: 14, temp: [25, 800], slider: PARK_X,
    narr: 'HEATING · H₂ flowing', color: '#7fc4ff',
    detail: '60 min ramp 25 → 800 °C under flowing H₂. Kanthal elements ramp; mullite former evens out axial gradients.' },
  { name: 'Homogenise', realMin: 40, animSec: 10, temp: [800, 800], slider: PARK_X,
    narr: 'HOMOGENISING · 800 °C', color: '#7fc4ff',
    detail: '40 min at 800 °C, ±0.1 °C PID. Charged As/Al dissolves; all melts undersaturated here.' },
  { name: 'Cool to 780', realMin: 20, animSec: 6, temp: [800, 780], slider: PARK_X,
    narr: 'COOLING · 800 → 780 °C', color: '#7fc4ff',
    detail: '20 min cool at 1 °C/min. Melts stay undersaturated until each reaches its liquidus.' },
  { name: 'Slide → well 0', realMin: 0.5, animSec: 1.2, from: PARK_X, to: P0, temp: [780, 780],
    narr: 'SLIDING · well 0', color: '#ffaa66',
    detail: 'Push rod through bellows moves slider. Slightly undersaturated Ga–As (well 0) aligns with wafer.' },
  { name: 'Melt-back', realMin: 2, animSec: 3, temp: [780, 780], slider: P0, meltback: true,
    narr: 'MELT-BACK · in-situ etch', color: '#ff7050',
    detail: 'Undersaturated melt dissolves a few µm of damaged/oxidised surface. Pure Ga would strip tens of µm.' },
  { name: 'Slide → well 1', realMin: 0.5, animSec: 1.2, from: P0, to: P1, temp: [780, 780],
    narr: 'SLIDING · well 1', color: '#ffaa66',
    detail: 'Graphite wall (wider than wafer) wipes melt off. Well 1 (GaAs, liquidus 780.0 °C) slides in.' },
  { name: 'Grow GaAs buffer', realMin: 15, animSec: 8, temp: [780.00, 777.75], slider: P1, deposit: 1, growthExp: 1.5,
    narr: 'GROWTH · GaAs buffer', color: '#7ee6a0',
    detail: 'Cooling 0.15 °C/min over 15 min (ΔT 2.25 °C). Solute (As) transport limits growth; growth ∝ t^1.5. Target 1.0 µm.' },
  { name: 'Slide → well 2', realMin: 0.5, animSec: 1.2, from: P1, to: P2, temp: [777.75, 777.75],
    narr: 'SLIDING · well 2', color: '#ffaa66',
    detail: 'Wall wipes melt. Well 2 (AlGaAs, liquidus 777.75 °C) aligning.' },
  { name: 'Grow AlGaAs lower', realMin: 12, animSec: 6, temp: [777.75, 775.75], slider: P2, deposit: 2, growthExp: 1.5,
    narr: 'GROWTH · Al₀.₃Ga₀.₇As lower', color: '#7ee6a0',
    detail: 'Cooling 0.17 °C/min over 12 min (ΔT 2.0 °C). Al partitions strongly into solid. Target 0.5 µm.' },
  { name: 'Slide → well 3', realMin: 0.5, animSec: 1.2, from: P2, to: P3, temp: [775.75, 775.75],
    narr: 'SLIDING · well 3', color: '#ffaa66',
    detail: 'Wall wipes melt. Well 3 (GaAs, liquidus 775.75 °C) aligning.' },
  { name: 'Grow GaAs active', realMin: 1, animSec: 3, temp: [775.75, 775.40], slider: P3, deposit: 3, growthExp: 1.5,
    narr: 'GROWTH · GaAs active layer', color: '#7ee6a0',
    detail: 'Short, small ΔT: 0.35 °C/min for 1 min. 0.1 µm GaAs active layer between claddings.' },
  { name: 'Slide → well 4', realMin: 0.5, animSec: 1.2, from: P3, to: P4, temp: [775.40, 775.40],
    narr: 'SLIDING · well 4', color: '#ffaa66',
    detail: 'Wall wipes melt. Well 4 (AlGaAs) aligning.' },
  { name: 'Grow AlGaAs upper', realMin: 8, animSec: 5, temp: [775.40, 773.90], slider: P4, deposit: 4, growthExp: 1.5,
    narr: 'GROWTH · Al₀.₃Ga₀.₇As upper', color: '#7ee6a0',
    detail: 'Cooling 0.19 °C/min over 8 min (ΔT 1.5 °C). Completes DH structure. Target 0.5 µm.' },
  { name: 'Slide to unload', realMin: 0.5, animSec: 1.2, from: P4, to: UNLOAD_X, temp: [773.90, 773.90],
    narr: 'SLIDING TO UNLOAD', color: '#ffaa66',
    detail: 'Slider continues past last bin. Wafer never re-contacts a melt.' },
  { name: 'Cool-down', realMin: 180, animSec: 10, temp: [773.90, 100], slider: UNLOAD_X,
    narr: 'COOLING DOWN · furnace off', color: '#5f7d9e',
    detail: 'Furnace off, natural cool under flowing H₂ to <100 °C. Do not open hot.' },
];
const CYCLE_TOTAL_ANIM = CYCLE.reduce((s, p) => s + p.animSec, 0);
const CYCLE_TOTAL_REAL = CYCLE.reduce((s, p) => s + p.realMin, 0);

function fmtMin(min) {
  if (min >= 60) { const h = Math.floor(min / 60); const m = Math.round(min - h * 60); return `${h} h ${String(m).padStart(2, '0')} min`; }
  if (min >= 1) return `${Math.round(min)} min`;
  return `${Math.round(min * 60)} s`;
}


export {CYCLE,CYCLE_TOTAL_ANIM,CYCLE_TOTAL_REAL,fmtMin};
