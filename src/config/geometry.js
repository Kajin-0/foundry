/* ============ DIMENSIONS ============ */
const TUBE_R = 0.42;
const TUBE_LEN = 12.60;
const TUBE_X = 6.30;
const FORMER_IN = 0.55;
const FORMER_OUT = 0.80;
const COIL_R = 0.82;
const INSUL_OUT = 1.60;
const SHELL_OUT = 1.65;

const WELL_OFFSETS = [-0.88, -0.44, 0, 0.44, 0.88];
const SLIDER_HALF = 1.13;
const PARK_X = 1.30;
const UNLOAD_X = -1.30;
const WELL_W = 0.22;
const WELL_D = 0.22;
const WELL_H = 0.10;
const WALL_W = 0.22;

const BASE_TOP = -0.30;
const SUB_TOP = BASE_TOP + 0.001;
const SUB_THICK = 0.020;
const SUB_SIZE = 0.18;
const SLIDER_BOT = -0.272;
const MELT_H = 0.06;
const BRIDGE_R = 0.05;
const CONTACT_THR = 0.06;

const BINS = [
  { mat: 'Ga melt',      color: 0xc0c4c8, glow: 0.35, thickness: null },
  { mat: 'GaAs (buffer)', color: 0xd8e0e8, glow: 0.80, thickness: 1.0 },
  { mat: 'Al₀.₃Ga₀.₇As', color: 0xc8b8a8, glow: 0.90, thickness: 0.5 },
  { mat: 'GaAs (active)', color: 0xdde5ee, glow: 0.85, thickness: 0.1 },
  { mat: 'Al₀.₃Ga₀.₇As', color: 0xc8b8a8, glow: 0.90, thickness: 0.5 },
];


const ZONES = [
  { x: -3.525, len: 2.30, role: 'end' },
  { x: -1.175, len: 2.30, role: 'main' },
  { x:  1.175, len: 2.30, role: 'main' },
  { x:  3.525, len: 2.30, role: 'end' },
];


export {TUBE_R,TUBE_LEN,TUBE_X,FORMER_IN,FORMER_OUT,COIL_R,INSUL_OUT,SHELL_OUT,WELL_OFFSETS,SLIDER_HALF,PARK_X,UNLOAD_X,WELL_W,WELL_D,WELL_H,WALL_W,BASE_TOP,SUB_TOP,SUB_THICK,SUB_SIZE,SLIDER_BOT,MELT_H,BRIDGE_R,CONTACT_THR,BINS,ZONES};
