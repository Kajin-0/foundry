import test from 'node:test';
import assert from 'node:assert/strict';
import {LITHO_RECIPE,LITHO_TOTAL,LITHO_PHASES,LITHO_FIELD_ORDER,lithoAtTime} from '../src/litho/process.js';
test('step and scan visits 36 unique fields in boustrophedon order',()=>{
 assert.equal(new Set(LITHO_FIELD_ORDER).size,36);
 assert.deepEqual(LITHO_FIELD_ORDER.slice(0,6),[0,1,2,3,4,5]);
 assert.deepEqual(LITHO_FIELD_ORDER.slice(6,12),[11,10,9,8,7,6]);
 assert.deepEqual(LITHO_FIELD_ORDER.slice(-6),[35,34,33,32,31,30]);
 assert.equal(LITHO_RECIPE.reduction,4);
 assert.equal(LITHO_RECIPE.NA,1.35);
 assert.equal(LITHO_TOTAL,19.8);
});
test('lithography exposure increments monotonically and clamps at endpoint',()=>{
 let prev=-1;
 for(let i=0;i<300;i++){
  const s=lithoAtTime(i/299*LITHO_TOTAL);
  assert.ok(s.completedFields>=prev);
  prev=s.completedFields;
  assert.ok(s.completedFields>=0&&s.completedFields<=36);
  assert.ok(s.scanProgress>=0&&s.scanProgress<=1);
  assert.ok(s.dose>=0&&s.dose<=30);
 }
 assert.equal(lithoAtTime(0).completedFields,0);
 assert.equal(lithoAtTime(18).completedFields,36);
 assert.equal(lithoAtTime(20).done,true);
 assert.equal(lithoAtTime(20).elapsed,LITHO_TOTAL);
});
