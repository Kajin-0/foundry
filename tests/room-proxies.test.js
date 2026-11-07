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
test('the 7 proxies occupy their real shared-room bays',()=>{
 const model=makeRoom();
 assert.deepEqual(Object.keys(model.proxies),['lpe','imm','mbe','cmp','litho','spin','implant','mocvd']);
 for(const [key,{x}] of Object.entries(BAYS)){
  assert.equal(model.proxies[key].position.x,x);
  const box=new THREE.Box3().setFromObject(model.proxies[key]);
  assert.ok(box.min.y>=-1e-5,key+' sits below floor');
  assert.ok(box.max.y>(key==='spin'||key==='implant'||key==='mocvd'?1.8:4),key+' is too small for detailed outer shape');
 }
 assert.equal(model.room.children.filter(c=>c.name.endsWith('bay-floor')).length,8);
 const floor=model.room.getObjectByName('room-ground-plane');
 const grid=model.room.getObjectByName('room-continuous-grid');
 assert.ok(floor?.isMesh);
 assert.ok(grid?.isLineSegments);
 assert.equal(floor.geometry.type,'PlaneGeometry');
 assert.equal(floor.geometry.index.count,6,'floor is a 2-triangle plane');
 assert.equal(floor.position.x,model.layout.centerX);
 assert.equal(grid.position.x,model.layout.centerX);
 assert.equal(grid.geometry.attributes.position.count,model.layout.gridDivisions*4+4);
 assert.equal(floor.geometry.parameters.width,model.layout.floorSize);
 assert.equal(grid.geometry.attributes.position.count,4*(model.layout.gridDivisions+1));
 assert.ok(model.layout.gridSize>=360,'grid ends must be beyond the fog horizon');
 model.setFocus('lpe');
 assert.equal(model.proxies.lpe.visible,false);
 assert.equal(model.proxies.imm.visible,true);
 assert.equal(model.proxies.mbe.visible,true);
 assert.equal(model.proxies.cmp.visible,true);
 assert.equal(model.proxies.litho.visible,true);
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

test('lithography proxy matches supported four-post granite stage and upper optics',()=>{
 const {proxies}=makeRoom(false),p=proxies.litho;
 assert.equal(byName(p,'litho-floor-leg').length,4);
 assert.equal(byName(p,'litho-upper-post').length,4);
 assert.equal(byName(p,'litho-optics').length,1);
 assert.equal(byName(p,'litho-laser').length,1);
 assert.equal(p.userData.silhouette.grounded,true);
});

test('implant overview matches the curved analyzer and grounded beamline assemblies',()=>{
 const {proxies}=makeRoom(false),p=proxies.implant;
 assert.equal(byName(p,'implant-analyzer-yoke').length,2);
 assert.equal(byName(p,'implant-analyzer-coil').length,2);
 assert.equal(byName(p,'implant-analyzer-vacuum-bend').length,1);
 assert.equal(byName(p,'implant-incoming-beamline').length,1);
 const inlet=byName(p,'implant-incoming-beamline')[0].geometry.parameters.path;
 const bend=byName(p,'implant-analyzer-vacuum-bend')[0].geometry.parameters.path;
 const outlet=byName(p,'implant-analyzer-exit')[0].userData.centerline;
 const nearly=(a,b)=>a.distanceTo(b)<1e-8;
 assert.ok(nearly(inlet.getPoint(1),bend.getPoint(0)),'inlet and analyzer must meet');
 assert.ok(nearly(bend.getPoint(1),new THREE.Vector3(...outlet.from)),'analyzer and exit must meet');
 assert.ok(inlet.getTangent(1).dot(bend.getTangent(0))>.999,
  'incoming pipe must be tangent to analyzer');
 assert.ok(bend.getTangent(1).dot(new THREE.Vector3(1,0,0))>.999,
  'outgoing pipe must leave along +X');
 assert.ok(bend.getPoint(.5).distanceTo(new THREE.Vector3(.50,1.20,-.60))>.59);
 assert.ok(Math.abs(bend.getPoint(0).distanceTo(new THREE.Vector3(.50,1.20,-.60))-.60)<1e-9);
 for(const pole of byName(p,'implant-analyzer-yoke'))assert.equal(pole.geometry.type,'RingGeometry');
 assert.equal(byName(p,'implant-analyzer-exit').length,1);
 assert.equal(byName(p,'implant-accelerator').length,1);
 assert.equal(byName(p,'implant-scanner-bellows').length,1);
 assert.equal(byName(p,'implant-end-station').length,1);
 assert.equal(byName(p,'implant-load-lock').length,1);
 assert.equal(byName(p,'implant-turbo-pump').length,1);
 assert.equal(byName(p,'implant-source-support').length,4);
 assert.equal(byName(p,'implant-frame-post').length,8);
 assert.equal(p.userData.silhouette.continuousBeamline,true);
 assert.equal(p.userData.silhouette.magnetYokes,2);
 const bbox=new THREE.Box3().setFromObject(p);
 assert.ok(bbox.min.y>=-1e-5);
 assert.ok(bbox.max.y>2);
 assert.ok(bbox.min.z< -3);
 assert.ok(bbox.max.x>p.position.x+4);
 assert.equal(p.userData.silhouette.analyzerAngle,90);
 assert.equal(p.userData.silhouette.bendRadius,.60);
 assert.ok(totalTriangles(p)<=3000,'overview proxy should remain inexpensive');
});

test('MOCVD overview retains a grounded chamber, load lock and process support',()=>{
 const p=makeRoom(false).proxies.mocvd;
 assert.equal(byName(p,'mocvd-chamber').length,1);
 assert.equal(byName(p,'mocvd-dome').length,1);
 assert.equal(byName(p,'mocvd-load-lock').length,1);
 assert.equal(byName(p,'mocvd-gas-cabinet').length,1);
 assert.equal(byName(p,'mocvd-scrubber').length,1);
 assert.equal(p.userData.silhouette.wafers,6);
 assert.equal(p.userData.silhouette.waferDiameterMm,100);
});
