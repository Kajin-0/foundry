import test from 'node:test';
import assert from 'node:assert/strict';
import {IBE,ibeRate,millMin,pumpCurve,lerpLog} from '../src/process/ion-etch.js';
test('ion etch flux: analytical normal-incidence calibration',()=>{
 const expected=IBE.Y0*IBE.J/(1.602e-19*IBE.n)*1e7*60;
 assert.ok(Math.abs(ibeRate(0)/expected-1)<1e-12);
});
test('time-depth dimensional consistency',()=>{
 assert.ok(Math.abs(millMin()*ibeRate(IBE.tilt)-IBE.depth*1000)<1e-8);
});
test('finite rates within supported tilt controls',()=>{
 for(let t=0;t<=60;t+=5)assert.ok(Number.isFinite(ibeRate(t))&&ibeRate(t)>0);
});
test('pump curve monotonic and positive',()=>{
 let p=Infinity;
 for(let t=0;t<=1;t+=0.01){const q=pumpCurve(Math.min(t,1));assert.ok(q>0&&q<=p*(1+1e-12));p=q;}
 assert.ok(Math.abs(pumpCurve(1)-5e-6)<1e-15);
});
test('log-interpolation positive endpoints',()=>{
 assert.equal(lerpLog(760,5e-6,0),760);
 assert.ok(Math.abs(lerpLog(760,5e-6,1)-5e-6)<1e-16);
});
