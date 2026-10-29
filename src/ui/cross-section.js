import {BINS} from '../config/geometry.js';
export function createCrossSection(IBE){
const XS = (() => {
  const svg = document.getElementById('xsec'), NS = 'http://www.w3.org/2000/svg', U = 20, Y0 = 80;
  const yy = (um) => Y0 - um * U;
  const mk = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; };
  mk('rect', { x: 0, y: Y0, width: 256, height: 12, fill: '#3a5a78' });
  const L = []; let base = 0, activeTop = 0;
  BINS.forEach((b, i) => { if (b.thickness === null) return;
    const c = '#' + b.color.toString(16).padStart(6, '0');
    const l = { b0: base, b1: base + b.thickness, fl: [mk('rect', { fill: c, x: 4, width: 116 }), mk('rect', { fill: c, x: 136, width: 116 })],
                rd: mk('rect', { fill: c, x: 120, width: 16 }) };
    l.rd.setAttribute('y', yy(l.b1)); l.rd.setAttribute('height', b.thickness * U); L.push(l); base += b.thickness; if (i === 3) activeTop = base; });
  const top = base;
  const res = mk('rect', { fill: '#d04830', x: 120, width: 16 });
  mk('line', { x1: 0, x2: 256, y1: yy(activeTop), y2: yy(activeTop), stroke: '#ffd060', 'stroke-width': 0.6, 'stroke-dasharray': '3 2' });
  mk('text', { x: 6, y: yy(activeTop) - 2, fill: '#ffd060', 'font-size': 7 }).textContent = 'active layer top';
  const txt = mk('text', { x: 142, y: 10, 'font-size': 8, fill: '#a6c4e0' });
  return { update(d, resFrac) {
    const floor = top - d;
    L.forEach(l => { const t = Math.max(l.b0, Math.min(l.b1, floor));
      l.fl.forEach(f => { f.setAttribute('y', yy(t)); f.setAttribute('height', Math.max(0, (t - l.b0) * U)); }); });
    const h = IBE.resistT * resFrac; res.setAttribute('y', yy(top + h)); res.setAttribute('height', h * U);
    const rem = floor - activeTop;
    txt.textContent = d <= 0 ? 'unetched' : rem > 0 ? `etch floor ${rem.toFixed(2)} µm above active` : 'FLOOR BELOW ACTIVE TOP';
    txt.setAttribute('fill', d > 0 && rem < 0.05 ? '#ff6a5a' : '#a6c4e0'); } };
})();
XS.update(0, 1);

return XS;
}
