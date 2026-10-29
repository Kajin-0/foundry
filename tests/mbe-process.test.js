import test from 'node:test';
import assert from 'node:assert/strict';
import {ML_NM,GA_ML_S,AL_ML_S,AL_FRACTION,rateMLs,rateUmH,durationMin,layerThicknessUmAt,phaseAt,CYCLE,TOTAL,LAYER_INFO,P_BASE,P_GROWTH} from '../src/mbe/process.js';
test('GaAs(001) one ML/s converts to approximately 1.018 µm/hr',()=>{
 assert.ok(Math.abs(rateUmH(1)-1.01817)<0.002);
});
test('AlGaAs x=0.30 and additive group-III flux rate',()=>{
 assert.ok(Math.abs(AL_FRACTION-.3)<1e-12);
 assert.ok(Math.abs(rateMLs(1,1)-(GA_ML_S+AL_ML_S))<1e-12);
 assert.ok(rateUmH(rateMLs(1,1))>rateUmH(1));
});
test('deposition schedule terminates at four design thicknesses',()=>{
 const actual=layerThicknessUmAt(TOTAL);
 actual.forEach((value,i)=>assert.ok(Math.abs(value-LAYER_INFO[i].thick)<1e-9));
 assert.ok(Math.abs(actual.reduce((a,b)=>a+b,0)-2.1)<1e-9);
});
test('physical layer thickness is monotonic and bounded across all phases',()=>{
 let previous=[0,0,0,0];
 for(let i=0;i<=1000;i++){
  const actual=layerThicknessUmAt(i/1000*TOTAL);
  actual.forEach((v,j)=>{
   assert.ok(v>=previous[j]-1e-12);
   assert.ok(v<=LAYER_INFO[j].thick+1e-12);
  });
  previous=actual;
 }
});
test('shutter-state semantics: no untracked deposition and calibration is not growth',()=>{
 for(const p of CYCLE){
  if(p.growthLayer!==undefined){assert.equal(p.gaO,1);assert.equal(p.asO,1);assert.ok(p.real>0);}
  else if((p.gaO||p.alO) && !p.calibrate)assert.fail('Open group-III shutters without a deposition or calibration phase: '+p.narr);
  if(p.calibrate)assert.equal(p.growthLayer,undefined);
 }
 assert.equal(CYCLE.at(-1).gaO,0);assert.equal(CYCLE.at(-1).alO,0);assert.equal(CYCLE.at(-1).asO,0);
});
test('oxide desorption begins with arsenic flux on',()=>{
 const stage=CYCLE.find(p=>p.narr.includes('OXIDE DESORPTION'));
 assert.ok(stage);assert.equal(stage.asO,1);assert.ok(stage.subT>=580);
});
test('phase lookup and pressure conventions stay finite',()=>{
 for(let i=0;i<=100;i++){
  const {phase,idx,local}=phaseAt(i/100*TOTAL);
  assert.ok(idx>=0&&idx<CYCLE.length&&phase&&local>=0&&local<=1);
 }
 assert.ok(P_GROWTH>P_BASE);
 assert.ok(Math.abs(durationMin(1,1)*60*ML_NM/1000-1)<1e-12);
});
