import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildRoom,BAYS} from '../src/scene/room.js';
import {ZONES,SHELL_OUT,TUBE_LEN} from '../src/config/geometry.js';

function makeRoom(batchProxies=false){
 const scene=new THREE.Scene();
 const model=buildRoom(scene,{batchProxies});
 return model;
}
const byName=(group,name)=>group.children.filter(c=>c.name===name);
const totalTriangles=group=>{
 let tris=0;
 group.traverse(o=>{if(o.isMesh)tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
 return tris;
};
test('the 4 proxies occupy their real shared-room bays',()=>{
 const model=makeRoom();
 assert.deepEqual(Object.keys(model.proxies),['lpe','imm','mbe','cmp']);
 for(const [key,{x}] of Object.entries(BAYS)){
  assert.equal(model.proxies[key].position.x,x);
  const box=new THREE.Box3().setFromObject(model.proxies[key]);
  assert.ok(box.min.y>=-1e-5,key+' sits below floor');
  assert.ok(box.max.y>4,key+' is too small for detailed outer shape');
 }
 assert.equal(model.room.children.filter(c=>c.name.endsWith('bay-floor')).length,4);
 model.setFocus('lpe');
 assert.equal(model.proxies.lpe.visible,false);
 assert.equal(model.proxies.imm.visible,true);
 assert.equal(model.proxies.mbe.visible,true);
 assert.equal(model.proxies.cmp.visible,true);
});
test('LPE matches four detailed furnace zones, tube length and four grounded frame posts',()=>{
 const {proxies}=makeRoom();
 const p=proxies.lpe;
 const zones=p.children.filter(o=>o.name.startsWith('lpe-zone-')&&/\d$/.test(o.name));
 assert.equal(zones.length,ZONES.length);
 for(let i=0;i<zones.length;i++){
  assert.ok(Math.abs(zones[i].position.x-ZONES[i].x)<1e-9);
  assert.equal(zones[i].geometry.parameters.height,ZONES[i].len);
  assert.equal(zones[i].geometry.parameters.radiusTop,SHELL_OUT);
  assert.equal(zones[i].position.y,2.65);
 }
 const tube=byName(p,'lpe-quartz-process-tube')[0];
 assert.equal(tube.geometry.parameters.height,TUBE_LEN);
 assert.equal(byName(p,'lpe-frame-leg').length,4);
 assert.equal(byName(p,'lpe-frame-longitudinal-rail').length,2);
 assert.equal(byName(p,'lpe-furnace-cradle').length,2);
 assert.equal(byName(p,'lpe-furnace-cradle')[0].geometry.parameters.depth,2.60);
 const frameLeg=byName(p,'lpe-frame-leg')[0];
 assert.equal(frameLeg.position.y-frameLeg.geometry.parameters.height/2,0);
 assert.equal(p.userData.silhouette.detailedFrameTopY,1.36);
});
test('ion mill chamber and load lock meet their supported frame and pump pedestal',()=>{
 const {proxies}=makeRoom();
 const p=proxies.imm;
 assert.equal(byName(p,'imm-frame-leg').length,4);
 assert.equal(byName(p,'imm-floor-skid').length,2);
 assert.equal(byName(p,'imm-load-lock-post').length,1);
 assert.equal(byName(p,'imm-pump-pedestal').length,1);
 assert.equal(byName(p,'imm-collar-frame-bracket').length,4);
 assert.equal(byName(p,'imm-turbo-base').length,1);
 assert.equal(byName(p,'imm-chamber')[0].geometry.parameters.radiusTop,1.8);
 const post=byName(p,'imm-frame-leg')[0];
 assert.ok(Math.abs(post.position.y+post.geometry.parameters.height/2-1.70)<1e-9);
 const pedestal=byName(p,'imm-pump-pedestal')[0];
 assert.equal(pedestal.position.y-pedestal.geometry.parameters.height/2,0);
 const turboBase=byName(p,'imm-turbo-base')[0];
 assert.ok(Math.abs(turboBase.position.y-turboBase.geometry.parameters.height/2-
 (pedestal.position.y+pedestal.geometry.parameters.height/2))<1e-8);
 const loadLockPost=byName(p,'imm-load-lock-post')[0];
 assert.ok(loadLockPost.position.y+loadLockPost.geometry.parameters.height/2>=3);
 assert.equal(p.userData.silhouette.loadLockSupported,true);
});
test('MBE retains tapered top, manipulator, collar and four floor posts',()=>{
 const {proxies}=makeRoom();
 const p=proxies.mbe;
 assert.equal(byName(p,'mbe-frame-leg').length,4);
 assert.equal(byName(p,'mbe-collar-frame-bracket').length,4);
 assert.equal(byName(p,'mbe-tapered-top').length,1);
 assert.equal(byName(p,'mbe-support-collar').length,1);
 assert.equal(byName(p,'mbe-manipulator-motor').length,1);
 assert.equal(byName(p,'mbe-side-flange').length,2);
 const leg=byName(p,'mbe-frame-leg')[0];
 assert.equal(leg.position.y-leg.geometry.parameters.height/2,0);
 assert.ok(Math.abs(leg.position.y+leg.geometry.parameters.height/2-1.92)<1e-9);
 assert.equal(byName(p,'mbe-uhv-chamber')[0].position.y,3.65);
});
test('proxy batching reduces draw calls without removing geometry or changing envelopes',()=>{
 const unbatched=makeRoom(false);
 const batched=makeRoom(true);
 for(const key of Object.keys(BAYS)){
  const before=unbatched.proxies[key],after=batched.proxies[key];
  assert.equal(totalTriangles(before),totalTriangles(after),key+' altered triangles');
  const a=new THREE.Box3().setFromObject(before), b=new THREE.Box3().setFromObject(after);
  assert.ok(a.min.distanceTo(b.min)<1e-5,key+' altered envelope min');
  assert.ok(a.max.distanceTo(b.max)<1e-5,key+' altered envelope max');
  assert.ok(batched.proxyStats[key].savedDrawCalls>0,key+' not batchable');
 }
});

test('CMP proxy has grounded bench, offset polishing head and anchored overhead carrier support',()=>{
 const {proxies}=makeRoom(false),p=proxies.cmp;
 assert.equal(byName(p,'cmp-table-leg').length,4);
 assert.equal(byName(p,'cmp-overhead-post').length,2);
 assert.equal(byName(p,'cmp-head-support').length,1);
 assert.equal(byName(p,'cmp-platen-and-pad').length,1);
 assert.equal(byName(p,'cmp-offset-carrier').length,1);
 assert.equal(byName(p,'cmp-table-top')[0].geometry.parameters.width,6.5);
 for(const leg of byName(p,'cmp-table-leg'))
  assert.ok(Math.abs(leg.position.y-leg.geometry.parameters.height/2)<1e-9);
 assert.equal(p.userData.silhouette.overheadAnchored,true);
});
