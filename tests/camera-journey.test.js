import test from 'node:test';
import assert from 'node:assert/strict';
import {smoothJourney,journeyDurationMs} from '../src/ui/camera-journey.js';
test('smooth camera curve is bounded, monotone and stops without an endpoint jump',()=>{
 assert.equal(smoothJourney(-5),0);assert.equal(smoothJourney(5),1);
 assert.equal(smoothJourney(0),0);assert.equal(smoothJourney(1),1);
 let previous=0;
 for(let i=1;i<=100;i++){
  const x=smoothJourney(i/100);
  assert.ok(x>=previous&&x<=1);
  previous=x;
 }
 assert.ok(smoothJourney(.01)<.001);
 assert.ok(smoothJourney(.99)>.999);
 assert.ok(Math.abs(smoothJourney(.3)+smoothJourney(.7)-1)<1e-12);
});
test('transitions remain short at any room distance and lighter on mobile',()=>{
 const near=journeyDurationMs(8),far=journeyDurationMs(170);
 assert.ok(near>=680&&near<far&&far<=1150);
 assert.ok(journeyDurationMs(170,true)<far);
 assert.throws(()=>journeyDurationMs(NaN),RangeError);
});
