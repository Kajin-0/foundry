/** Camera-only math. Runs inside the existing WebGL RAF; no new timers/loops. */
export function smoothJourney(t){
 const u=Math.max(0,Math.min(1,t));
 return u*u*(3-2*u);
}
export function journeyDurationMs(distance,lowPower=false){
 if(!Number.isFinite(distance)||distance<0)throw new RangeError('Invalid camera distance');
 const base=Math.max(680,Math.min(1150,680+distance*3.6));
 return lowPower?Math.round(base*.80):Math.round(base);
}
