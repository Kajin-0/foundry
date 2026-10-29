import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Merge co-material rigid meshes WITHOUT decimating any geometry. Every face,
 * normal and UV is preserved; each baked local transform becomes part of its
 * mesh's vertices. Only direct children of one static station are eligible.
 *
 * Animated groups, instancing, transparency, skeletal meshes and explicitly
 * excluded meshes are never merged. Compatible geometry signatures are
 * required; otherwise objects are left untouched.
 */
export function mergeStaticDrawCalls(group,{exclude=new Set()}={}){
 if(!group?.isGroup)throw new TypeError('Expected a THREE.Group');
 const before=group.children.filter(o=>o.isMesh||o.isInstancedMesh).length;
 const buckets=new Map();
 for(const object of [...group.children]){
  if(!object.isMesh||object.isInstancedMesh||object.isSkinnedMesh)continue;
  if(exclude.has(object)||object.userData.noStaticMerge)continue;
  if(Array.isArray(object.material)||object.material.transparent||
     object.material.isMeshBasicMaterial)continue;
  if(object.geometry.morphAttributes &&
     Object.values(object.geometry.morphAttributes).some(x=>x?.length))continue;
  const attrs=Object.entries(object.geometry.attributes).sort(([a],[b])=>a.localeCompare(b));
  if(!attrs.length)continue;
  const signature=attrs.map(([name,a])=>name+':'+a.itemSize+':'+a.normalized+':'+a.array.constructor.name).join('|');
  const key=object.material.uuid+';'+(object.geometry.index?'indexed':'nonindexed')+';'+signature;
  if(!buckets.has(key))buckets.set(key,[]);
  buckets.get(key).push(object);
 }
 let savedDrawCalls=0,mergedGroups=0,mergedMeshes=0;
 for(const objects of buckets.values()){
  if(objects.length<2)continue;
  const copies=[];
  try{
   for(const mesh of objects){
    mesh.updateMatrix();
    const copy=mesh.geometry.clone();
    copy.applyMatrix4(mesh.matrix);
    copies.push(copy);
   }
   const mergedGeometry=mergeGeometries(copies,false);
   if(!mergedGeometry)continue; // Unsupported input: leave objects intact.
   const mergedMesh=new THREE.Mesh(mergedGeometry,objects[0].material);
   mergedMesh.name='Static detail batch ('+objects.length+' identical-material meshes)';
   mergedMesh.castShadow=objects.some(o=>o.castShadow);
   mergedMesh.receiveShadow=objects.some(o=>o.receiveShadow);
   // Station clipping and fragment shading remain on the original material.
   group.add(mergedMesh);
   for(const mesh of objects)group.remove(mesh);
   mergedGroups++;
   mergedMeshes+=objects.length;
   savedDrawCalls+=objects.length-1;
  }finally{for(const copy of copies)copy.dispose();}
 }
 const after=group.children.filter(o=>o.isMesh||o.isInstancedMesh).length;
 return Object.freeze({before,after,mergedGroups,mergedMeshes,savedDrawCalls});
}
