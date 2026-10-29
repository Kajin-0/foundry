import test from 'node:test';
import assert from 'node:assert/strict';
import {CMP_TOTAL,CMP_REAL_MIN,CMP_RECIPE,CMP_PHASES,cmpAtTime} from '../src/cmp/process.js';

test('CMP has one fixed, plausible five-phase silicon STI demo',()=>{
 assert.deepEqual(CMP_PHASES.map(p=>p.key),
  ['load','condition','polish','overpolish','unload']);
 assert.equal(CMP_TOTAL,19.5);
 assert.equal(CMP_REAL_MIN,8.5);
 assert.equal(CMP_RECIPE.pressurePsi,3);
 assert.equal(CMP_RECIPE.platenRPM,80);
 assert.equal(CMP_RECIPE.carrierRPM,75);
 assert.equal(CMP_RECIPE.slurryPH,10.5);
 assert.equal(CMP_RECIPE.oxideTargetNm,500);
 assert.equal(CMP_RECIPE.oxideRateNmMin/CMP_RECIPE.nitrideRateNmMin,20);
});

test('CMP optical/nitride cross-section follows monotonic endpoint without overshooting',()=>{
 let prevOxide=-1,prevNitride=-1;
 for(let step=0;step<=200;step++){
  const state=cmpAtTime(CMP_TOTAL*step/200);
  assert.ok(state.oxideRemovedNm>=prevOxide,'oxide removal regressed');
  assert.ok(state.nitrideErodedNm>=prevNitride,'nitride erosion regressed');
  assert.ok(state.oxideRemovedNm>=0&&state.oxideRemovedNm<=500);
  assert.ok(state.nitrideErodedNm>=0&&state.nitrideErodedNm<=2.5);
  prevOxide=state.oxideRemovedNm;prevNitride=state.nitrideErodedNm;
 }
 assert.equal(cmpAtTime(4).oxideRemovedNm,0);
 assert.equal(cmpAtTime(16).oxideRemovedNm,500);
 assert.equal(cmpAtTime(18).nitrideErodedNm,2.5);
 assert.equal(cmpAtTime(19.5).done,true);
 assert.equal(cmpAtTime(25).elapsed,CMP_TOTAL);
});
test('CMP wafer approaches pad before film removal and withdraws after endpoint',()=>{
 const early=cmpAtTime(4.3),contact=cmpAtTime(5.3),end=cmpAtTime(18);
 assert.equal(early.oxideRemovedNm,0);
 assert.ok(early.waferLift>0);
 assert.equal(contact.waferLift,0);
 assert.ok(contact.oxideRemovedNm>0);
 assert.equal(end.endpoint,true);
 assert.equal(cmpAtTime(CMP_TOTAL).waferLift,1);
});
