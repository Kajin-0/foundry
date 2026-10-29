import {ZONES} from '../config/geometry.js';
export function createThermalProfile(){
/* ============ THERMAL PROFILE ============ */
const profileSvg = document.getElementById('tProfileContent');
function drawProfileAtTemp(mainTemp) {
  const W = 256, H = 42, ML = 6, MR = 6, MT = 4, MB = 8;
  const xMin = -5.5, xMax = 5.5, yMin = 0, yMax = 820, GUARD_END = 4.675, AMBIENT = 25;
  const N = 80;
  const profileAt = (x) => {
    const ax = Math.abs(x);
    if (ax < GUARD_END - 0.10) return mainTemp;
    const t = Math.min(1, (ax - GUARD_END + 0.10) / 1.0);
    const sm = t * t * (3 - 2 * t);
    return mainTemp - sm * (mainTemp - AMBIENT);
  };
  let d = '';
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = xMin + t * (xMax - xMin);
    const temp = profileAt(x);
    const px = ML + t * (W - ML - MR);
    const py = MT + (1 - (temp - yMin) / (yMax - yMin)) * (H - MT - MB);
    d += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1) + ' ';
  }
  const fill = d + `L ${W - MR},${H - MB} L ${ML},${H - MB} Z`;
  let markers = '';
  ZONES.forEach(z => {
    const bx = z.x - z.len / 2;
    const t = (bx - xMin) / (xMax - xMin);
    const px = ML + t * (W - ML - MR);
    if (px > ML + 1 && px < W - MR - 1) {
      markers += `<line x1="${px.toFixed(1)}" y1="${MT}" x2="${px.toFixed(1)}" y2="${H - MB}" stroke="#3d7fd6" stroke-width="0.4" opacity="0.30" stroke-dasharray="1.5,1.5"/>`;
    }
  });
  profileSvg.innerHTML = `
    <path d="${fill}" fill="url(#tGrad)"/>
    <path d="${d}" fill="none" stroke="#3d7fd6" stroke-width="1.3" stroke-linejoin="round"/>
    ${markers}
    <text x="${ML}" y="${H - 1}" font-size="4.5" fill="#5f7d9e" letter-spacing="0.6">COLD</text>
    <text x="${W / 2 - 12}" y="${H - 1}" font-size="4.5" fill="#7ee6a0" letter-spacing="0.6">BOAT</text>
    <text x="${W - MR - 14}" y="${H - 1}" font-size="4.5" fill="#5f7d9e" letter-spacing="0.6">COLD</text>
  `;
}
drawProfileAtTemp(25);
let lastProfileTemp = 25;
function maybeUpdateProfile(t) {
  if (Math.abs(t - lastProfileTemp) < 1.5) return;
  lastProfileTemp = t;
  drawProfileAtTemp(t);
}


return {maybeUpdateProfile};
}
