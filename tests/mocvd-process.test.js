import test from 'node:test';
import assert from 'node:assert/strict';
import {MOCVD_PRESET,mocvdPhaseAt,mocvdStateAt,MOCVD_MODEL_SECONDS} from '../src/mocvd/controller.js';
test('fixed six-wafer MOCVD recipe preserves growth and ideal spectral values',()=>{
 assert.equal(MOCVD_PRESET.batch,6);
 assert.equal(MOCVD_PRESET.thicknessUm/MOCVD_PRESET.growthRateUmH*60,75);
 const x=.53,k=1.15*Math.exp(-.002*(620-550));
 const solid=x*k/(x*k+(1-x));
 const Eg=solid*.354+(1-solid)*1.424-.477*solid*(1-solid);
 assert.ok(Math.abs(Eg-MOCVD_PRESET.bandgapEv)<.002);
 assert.ok(Math.abs(1.2398/Eg-MOCVD_PRESET.bandgapLambdaUm)<.005);
});
test('phase boundaries, layer progression and inert vent are consistent',()=>{
 assert.deepEqual([0,4,9,11,30,37,40].map(mocvdPhaseAt),
  ['load','heat','stabilize','grow','cool','unload','done']);
 assert.equal(mocvdStateAt(11).thickness,0);
 assert.equal(mocvdStateAt(30).thickness,2.5);
 for(let t=0;t<MOCVD_MODEL_SECONDS;t+=.125){
  const a=mocvdStateAt(t),b=mocvdStateAt(t+.125);
  assert.ok(b.thickness>=a.thickness&&b.thickness<=2.5);
  assert.ok(Number.isFinite(a.T_now)&&a.T_now>=25&&a.T_now<=620);
 }
 assert.equal(mocvdStateAt(37).T_now,100);
 assert.equal(mocvdStateAt(40).pressure,'760 Torr N₂');
 assert.equal(mocvdStateAt(40).rotationRpm,0);
});
