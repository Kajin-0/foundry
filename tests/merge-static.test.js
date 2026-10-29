import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mergeStaticDrawCalls} from '../src/scene/merge-static.js';

test('batches static co-material geometry without changing vertices or normals',()=>{
 const parent=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0x556677});
 for(const [x,y,theta] of [[1,2,0],[-3,1,.4],[.4,-2,1.1]]){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,3),mat);
  mesh.position.set(x,y,1);mesh.rotation.set(0,theta,0);parent.add(mesh);
 }
 const originals=parent.children.map(o=>{o.updateMatrix();return o.geometry.attributes.position.count});
 const stats=mergeStaticDrawCalls(parent);
 assert.equal(stats.before,3);
 assert.equal(stats.after,1);
 assert.equal(stats.savedDrawCalls,2);
 assert.equal(stats.mergedMeshes,3);
 assert.equal(parent.children[0].material,mat);
 assert.equal(parent.children[0].geometry.attributes.position.count,
  originals.reduce((a,b)=>a+b));
 assert.equal(parent.children[0].geometry.attributes.normal.count,
  originals.reduce((a,b)=>a+b));
});

test('preserves dynamic, transparent, instanced, dissimilar-material and nested meshes',()=>{
 const parent=new THREE.Group(),metal=new THREE.MeshStandardMaterial(),glass=new THREE.MeshStandardMaterial({transparent:true});
 const dynamic=new THREE.Mesh(new THREE.BoxGeometry(),metal),solid=new THREE.Mesh(new THREE.BoxGeometry(),metal);
 parent.add(dynamic,solid); // only one eligible after excluding dynamic
 const clear=new THREE.Mesh(new THREE.BoxGeometry(),glass);
 parent.add(clear);
 const other=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());
 parent.add(other);
 const nested=new THREE.Group();nested.add(new THREE.Mesh(new THREE.BoxGeometry(),metal));parent.add(nested);
 const instanced=new THREE.InstancedMesh(new THREE.BoxGeometry(),metal,5);parent.add(instanced);
 const stats=mergeStaticDrawCalls(parent,{exclude:new Set([dynamic])});
 assert.equal(stats.savedDrawCalls,0);
 assert.equal(parent.children.length,6);
 assert.equal(nested.children.length,1);
});

test('merged rigid cylinders retain exact total vertex count',()=>{
 const parent=new THREE.Group(),metal=new THREE.MeshStandardMaterial();
 for(let i=0;i<12;i++){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.2,.4,.5,16),metal);
  mesh.position.set(i%4,i/4,0);parent.add(mesh);
 }
 const total=parent.children.reduce((s,m)=>s+m.geometry.attributes.position.count,0);
 const stats=mergeStaticDrawCalls(parent);
 assert.equal(stats.savedDrawCalls,11);
 assert.equal(parent.children[0].geometry.attributes.position.count,total);
});
