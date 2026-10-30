import * as THREE from 'three';
import {mergeStaticDrawCalls} from '../scene/merge-static.js';
import {LITHO_FIELD_ORDER} from './process.js';
export const LITHO_X=62;
export function buildLitho({scene,batchStatic=true}){
 const group=new THREE.Group();group.name='ArF immersion scanner';group.position.x=LITHO_X;scene.add(group);
 const M={
  frame:new THREE.MeshStandardMaterial({color:0x343e4a,metalness:.8,roughness:.48}),
  dark:new THREE.MeshStandardMaterial({color:0x171e29,metalness:.65,roughness:.55}),
  granite:new THREE.MeshStandardMaterial({color:0x34333c,metalness:.15,roughness:.81}),
  steel:new THREE.MeshStandardMaterial({color:0x9daeba,metalness:.87,roughness:.3}),
  reticle:new THREE.MeshStandardMaterial({color:0x72699a,metalness:.25,roughness:.23,transparent:true,opacity:.67,depthWrite:false}),
  wafer:new THREE.MeshStandardMaterial({color:0x61738a,metalness:.8,roughness:.19}),
  optics:new THREE.MeshStandardMaterial({color:0x536575,metalness:.75,roughness:.3}),
  water:new THREE.MeshStandardMaterial({color:0x84c9e6,transparent:true,opacity:.43,depthWrite:false,roughness:.15}),
  beam:new THREE.MeshBasicMaterial({color:0xb392ff,transparent:true,opacity:.36,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),
  exposed:new THREE.MeshBasicMaterial({color:0x9467db,side:THREE.DoubleSide}),
  green:new THREE.MeshBasicMaterial({color:0x72dfad})
 };
 const cube=(p,w,h,d,m,x,y,z,name='')=>{const v=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);v.position.set(x,y,z);v.name=name;p.add(v);return v;};
 const cyl=(p,r,h,m,x,y,z,n=20,name='')=>{const v=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,n),m);v.position.set(x,y,z);v.name=name;p.add(v);return v;};
 const base=cube(group,5.1,.22,4.9,M.dark,0,.13,0,'floor skid');
 for(const x of [-2.1,2.1])for(const z of [-2,2]){
  cube(group,.22,1.2,.22,M.frame,x,.72,z,'grounded post');
  cube(group,.40,.06,.40,M.dark,x,.03,z,'leveling foot');
 }
 cube(group,4.6,.12,4.4,M.frame,0,.44,0,'lower machine tie');
 const granite=cube(group,3.4,.30,3.35,M.granite,0,1.12,0,'granite stage');
 const top=cube(group,2.75,.09,2.8,M.steel,0,1.32,0,'stage table');
 const stage=new THREE.Group();stage.position.y=1.405;stage.name='positioning stage';group.add(stage);
 cube(stage,.86,.075,.86,M.dark,0,.04,0);
 cyl(stage,.39,.055,M.frame,0,.11,0,32,'vacuum chuck');
 cyl(stage,.31,.016,M.wafer,0,.15,0,40,'300 mm wafer');
 // The original 36 individual shader materials become a single instanced field array.
 const fieldGeometry=new THREE.PlaneGeometry(.052,.066);
 const fields=new THREE.InstancedMesh(fieldGeometry,M.exposed,36);
 fields.name='36 reticle exposure fields · instanced';
 fields.rotation.x=-Math.PI/2;fields.position.y=.16;fields.frustumCulled=false;
 const dummy=new THREE.Object3D();const fieldColors=[new THREE.Color(0x8293b1),new THREE.Color(0xb294ed)];
 for(let n=0;n<36;n++){
  const row=Math.floor(n/6),col=n%6;
  dummy.position.set((col-2.5)*.06136,(2.5-row)*.07788,0);
  dummy.updateMatrix();fields.setMatrixAt(n,dummy.matrix);fields.setColorAt(n,fieldColors[0]);
 }
 fields.instanceMatrix.needsUpdate=true;
 // Planes are XZ after rotation: local X maps to stage X, local Y maps to stage -Z.
 stage.add(fields);
 const marks=new THREE.Group();marks.name='alignment marks';stage.add(marks);
 for(const x of [-.215,.215])for(const z of [-.215,.215]){
  cube(marks,.028,.002,.005,M.green,x,.164,z);cube(marks,.005,.002,.028,M.green,x,.164,z);
 }
 marks.visible=false;
 // Upper optical system supported by four full-height frame members.
 for(const x of [-2.25,2.25])for(const z of [-2.1,2.1]){
  cube(group,.15,3.65,.15,M.frame,x,1.93,z,'upper support post');
 }
 for(const z of [-2.1,2.1])cube(group,4.65,.15,.16,M.frame,0,3.72,z,'upper frame beam');
 for(const x of [-2.25,2.25])cube(group,.15,.15,4.3,M.frame,x,3.72,0,'upper crossbeam');
 const lens=cyl(group,.30,1.26,M.optics,0,2.16,0,24,'projection optics barrel');
 for(const y of [1.56,1.90,2.25,2.7])cyl(group,.36,.08,M.steel,0,y,0,24,'lens flange');
 // A small actual visible immersion meniscus at the wafer.
 cyl(group,.16,.025,M.water,0,1.583,0,24,'immersion water');
 const reticleGroup=new THREE.Group();reticleGroup.position.y=3.02;reticleGroup.name='reticle stage';group.add(reticleGroup);
 cube(reticleGroup,.60,.035,.55,M.frame,0,0,0,'reticle carrier');
 cube(reticleGroup,.41,.038,.37,M.reticle,0,-.023,0,'4x mask');
 for(let i=0;i<9;i++)cube(reticleGroup,.008,.003,.26,M.dark,(i-4)*.038,-.049,0);
 cube(group,1.35,.12,.16,M.steel,0,3.25,-.34,'reticle overhead rail');
 const illuminator=cyl(group,.27,.43,M.optics,0,3.39,0,22,'illuminator');
 const laser=cube(group,.85,.48,.75,M.dark,-1.44,1.82,0,'193nm excimer module');
 cube(group,.45,.54,.55,M.frame,-1.44,1.36,0,'laser grounded pedestal');
 cube(group,.35,.35,.20,M.steel,-1.44,2.18,0,'laser arm joint');
 // Opaque BDU representation, with a thin purple beam tube that is visible
 // only while exposed; fewer transparent layers than the supplied demo.
 const feed=cube(group,.12,1.02,.12,M.frame,-1.44,2.87,0,'laser duct');
 cube(group,1.46,.12,.12,M.frame,-.73,3.35,0,'beam duct');
 const beam=cube(group,.13,1.68,.06,M.beam,0,2.42,0,'exposure beam');
 beam.visible=false;
 const slit=cube(group,.19,.003,.037,M.beam,0,1.59,0,'scan slit');
 slit.visible=false;
 const activeScan=new THREE.Mesh(new THREE.PlaneGeometry(.052,.008),
  new THREE.MeshBasicMaterial({color:0xe3bdff,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide}));
 activeScan.rotation.x=-Math.PI/2;activeScan.position.y=.172;stage.add(activeScan);
 activeScan.visible=false;
 // Preserve all moving members and individual field instances when merging.
 const stats=batchStatic?mergeStaticDrawCalls(group,{exclude:new Set([stage,reticleGroup,beam,slit])}):null;
 group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
 const cols=new Array(36).fill(false);
 function setVisual(s,dt){
  const chosen=LITHO_FIELD_ORDER[s.fieldIndex],row=Math.floor(chosen/6),col=chosen%6;
  // Stage steps to the field, then scans across the fixed projection slit.
  const fieldX=(col-2.5)*.06136,fieldZ=(row-2.5)*.07788;
  const moving=s.idx===2;
  const targetX=moving?-fieldX:0,targetZ=moving?-fieldZ+(s.beamOn?(s.scanProgress-.5)*.066:0):0;
  const smoothing=Math.min(1,dt*9);
  stage.position.x+=(targetX-stage.position.x)*smoothing;
  stage.position.z+=(targetZ-stage.position.z)*smoothing;
  reticleGroup.position.z=s.beamOn?-(s.scanProgress-.5)*.264:0;
  beam.visible=s.beamOn;slit.visible=s.beamOn;activeScan.visible=s.beamOn;
  activeScan.position.x=fieldX;
  activeScan.position.z=fieldZ;
  for(let i=0;i<36;i++){
    const shouldExpose=s.idx>2||s.idx===2&&(i<s.fieldIndex||(i===s.fieldIndex&&s.scanProgress>.5));
    if(cols[i]!==shouldExpose){cols[i]=shouldExpose;fields.setColorAt(LITHO_FIELD_ORDER[i],fieldColors[shouldExpose?1:0]);fields.instanceColor.needsUpdate=true;}
  }
  marks.visible=s.idx===1;
 }
 function reset(){cols.fill(false);for(let n=0;n<36;n++)fields.setColorAt(n,fieldColors[0]);fields.instanceColor.needsUpdate=true;
  stage.position.set(0,1.405,0);reticleGroup.position.z=0;beam.visible=false;slit.visible=false;activeScan.visible=false;marks.visible=false;}
 return {group,stats,stage,reticleGroup,fields,beam,slit,setVisual,reset};
}
