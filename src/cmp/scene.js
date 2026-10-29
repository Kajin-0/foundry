import * as THREE from 'three';
import {mergeStaticDrawCalls} from '../scene/merge-static.js';

// All CMP coordinates are local to the fourth, floor-supported Foundry bay.
// Dimensionless geometry is illustrative; no CAD fabrication tolerances implied.
export const CMP_BAY_X=46;
export const CMP_GEOM=Object.freeze({
 tableTop:1.10,tableWidth:6.50,platenY:1.50,padTopY:1.68,
 headX:1.0,headContactY:1.9075,headLiftY:2.5675,bridgeY:4.90
});
export function buildCMP({scene,batchStatic=true}){
 const group=new THREE.Group();group.name='CMP · chemical mechanical planarization';
 group.position.x=CMP_BAY_X;scene.add(group);
 const mat={
  dark:new THREE.MeshStandardMaterial({color:0x181f29,metalness:.55,roughness:.68}),
  leg:new THREE.MeshStandardMaterial({color:0x43505f,metalness:.72,roughness:.48}),
  steel:new THREE.MeshStandardMaterial({color:0x9aabbc,metalness:.88,roughness:.37}),
  top:new THREE.MeshStandardMaterial({color:0x3a434e,metalness:.72,roughness:.48}),
  tray:new THREE.MeshStandardMaterial({color:0x384551,metalness:.55,roughness:.60}),
  pad:new THREE.MeshStandardMaterial({color:0x737982,metalness:.08,roughness:.85}),
  wafer:new THREE.MeshStandardMaterial({color:0x64798c,metalness:.76,roughness:.24}),
  ring:new THREE.MeshStandardMaterial({color:0x9b754a,metalness:.70,roughness:.43}),
  slurry:new THREE.MeshBasicMaterial({color:0x81c9ed,transparent:true,opacity:.65,depthWrite:false}),
  highlight:new THREE.MeshBasicMaterial({color:0x8cceeb,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})
 };
 // A small, stable dimple texture reads as CMP polyurethane, without extra
 // pad geometry or per-frame canvas generation.
 const c=document.createElement('canvas');c.width=c.height=128;
 const ctx=c.getContext('2d');
 if(ctx){
  ctx.fillStyle='#858994';ctx.fillRect(0,0,128,128);
  for(let y=5;y<128;y+=12)for(let x=5;x<128;x+=12){
   ctx.beginPath();ctx.fillStyle='#515c6a';ctx.arc(x+(y%24?4:0),y,2.5,0,Math.PI*2);ctx.fill();
  }
  const texture=new THREE.CanvasTexture(c);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,3);
  mat.pad.map=texture;mat.pad.needsUpdate=true;
 }
 const cub=(w,h,d,m,x,y,z,parent=group,name='')=>{
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.name=name;parent.add(o);return o;
 };
 const cyl=(rt,rb,h,m,x,y,z,parent=group,seg=24,name='')=>{
  const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m);o.position.set(x,y,z);o.name=name;parent.add(o);return o;
 };
 const tor=(rad,tube,m,x,y,z,parent=group,seg=24)=>{
  const o=new THREE.Mesh(new THREE.TorusGeometry(rad,tube,5,seg),m);
  o.rotation.x=Math.PI/2;o.position.set(x,y,z);parent.add(o);return o;
 };
 // Grounded machine bench, shelf, splash tray and pump/control cabinet.
 const width=CMP_GEOM.tableWidth;
 cub(width,.12,width,mat.top,0,1.04,0,group,'cmp-tool-bench');
 cub(width,.18,.08,mat.leg,0,.88,width/2-.08);
 cub(width,.18,.08,mat.leg,0,.88,-width/2+.08);
 for(const x of [-2.85,2.85])for(const z of [-2.85,2.85]){
  cub(.19,.99,.19,mat.leg,x,.495,z,group,'cmp-frame-post');
  cyl(.25,.25,.06,mat.dark,x,.03,z,group,10);
 }
 cub(6.2,.09,6.2,mat.leg,0,.35,0);
 cub(1.80,.55,1.30,mat.dark,-1.70,.67,-.20);
 cub(.02,.40,.75,mat.leg,-.79,.69,-.20);
 const tray=cyl(2.85,2.85,.16,mat.tray,0,1.20,0,group,36);
 const rim=tor(2.84,.10,mat.leg,0,1.34,0,group,32);
 // Platen has a real rotating spindle, and a single rigid pad surface.
 cyl(.34,.34,.27,mat.steel,0,1.41,0);
 const platenGroup=new THREE.Group();platenGroup.position.y=CMP_GEOM.platenY;platenGroup.name='CMP platen';
 group.add(platenGroup);
 cyl(2,2,.16,mat.steel,0,0,0,platenGroup,40);
 cyl(2.02,2.02,.08,mat.pad,0,.14,0,platenGroup,40);
 const padHighlight=new THREE.Mesh(new THREE.RingGeometry(.62,1.84,48),mat.highlight);
 padHighlight.rotation.x=-Math.PI/2;padHighlight.position.y=.184;
 platenGroup.add(padHighlight);
 // An anchored overhead gantry, absent from the uploaded free-standing head.
 // Rear posts connect the crossbeam to the bench; bridge reaches the
 // rotating carrier at x=1.0, z=0. A telescoping link follows head lift.
 for(const x of [-2.70,2.70]){
  cub(.20,3.78,.20,mat.leg,x,2.97,-2.45,group,'cmp-overhead-stand');
  cub(.34,.16,.36,mat.dark,x,1.16,-2.45);
 }
 cub(5.60,.20,.24,mat.leg,0,4.87,-2.45,group,'cmp-overhead-crossbeam');
 cub(.23,.16,2.55,mat.steel,CMP_GEOM.headX,4.87,-1.20,group,'cmp-head-support-bridge');
 cyl(.40,.40,.32,mat.dark,CMP_GEOM.headX,4.76,0);
 const head=new THREE.Group();head.position.set(CMP_GEOM.headX,CMP_GEOM.headLiftY,0);
 head.name='CMP carrier and face-down wafer';group.add(head);
 cyl(.61,.61,.37,mat.steel,0,0,0,head,32);
 cyl(.54,.54,.03,mat.dark,0,-.19,0,head,30);
 const wafer=cyl(.50,.50,.025,mat.wafer,0,-.215,0,head,32);
 tor(.55,.042,mat.ring,0,-.19,0,head,28);
 cyl(.11,.11,1.16,mat.steel,0,.75,0,head,16);
 cyl(.26,.26,.34,mat.dark,0,1.45,0,head,18);
 cyl(.24,.24,.08,mat.steel,0,1.66,0,head,16);
 const link=cyl(.10,.10,1,mat.steel,CMP_GEOM.headX,4.42,0,group,12);
 // Accessible and restrained feed/conditioner arms, rigidly attached to the
 // grounded bench instead of floating over the platen.
 cub(.17,1.8,.17,mat.steel,2.45,2.00,1.40);
 cub(2.0,.12,.15,mat.steel,1.55,2.87,1.40);
 const slurryNozzle=cyl(.052,.052,.96,mat.ring,.56,2.39,1.40,group,12);
 cub(.13,1.8,.13,mat.steel,-2.45,2.00,.80);
 cub(2.05,.10,.12,mat.steel,-1.60,2.87,.80);
 const conditioner=new THREE.Group();conditioner.position.set(-.80,2.02,.80);
 conditioner.name='CMP pad conditioner';group.add(conditioner);
 cyl(.07,.07,.85,mat.steel,0,.41,0,conditioner,12);
 const disk=cyl(.24,.24,.09,mat.leg,0,-.07,0,conditioner,18);
 // Efficient slurry: a single instanced pool (not dozens of clone materials).
 const particleMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(.028,6,4),mat.slurry,30);
 particleMesh.name='CMP slurry droplets · instanced';
 particleMesh.frustumCulled=false;particleMesh.count=0;particleMesh.visible=false;
 group.add(particleMesh);
 const dummy=new THREE.Object3D();
 const staticStats=batchStatic?mergeStaticDrawCalls(group,{exclude:new Set([link])}):null;
 // The platen, wafer, conditioner and particles are all nested or excluded:
 // geometry batching only touches rigid external structure.
 group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
 return {
  group,platenGroup,head,link,conditioner,padHighlight,particleMesh,dummy,
  staticStats,wafer,geometry:CMP_GEOM,tableTop:tray,slurryNozzle,
  setVisual(state,time,visible=true){
   if(!visible)return;
   const dt=state._dt||0;
   platenGroup.rotation.y+=state.platenRPM*(Math.PI*2/60)*dt;
   head.rotation.y+=state.carrierRPM*(Math.PI*2/60)*dt;
   head.position.y=CMP_GEOM.headLiftY-(CMP_GEOM.headLiftY-CMP_GEOM.headContactY)*(1-state.waferLift);
   const shaftTop=head.position.y+1.70;
   const bridgeBottom=4.65;
   const length=Math.max(.06,bridgeBottom-shaftTop);
   link.scale.y=length;
   link.position.y=(shaftTop+bridgeBottom)*.5;
   conditioner.rotation.y+=state.conditioning?dt*6:0;
   const polish=state.phase.key==='polish'||state.phase.key==='overpolish';
   padHighlight.material.opacity=polish?.22:0;
   const count=state.slurryMlMin>25?18:0;
   particleMesh.count=count;particleMesh.visible=count>0;
   if(count){
    const phase=time*1.7;
    for(let i=0;i<count;i++){
      const a=i*2.4+phase*.15;
      const along=(phase+i*.37)%1;
      const px=(i<8?.56:Math.cos(a)*1.9);
      const py=i<8?2.42-along*.72:1.70+.09*Math.sin(a+phase);
      const pz=i<8?1.40:Math.sin(a)*1.9;
      dummy.position.set(px,py,pz);
      dummy.scale.setScalar(.65+(i%3)*.23);
      dummy.updateMatrix();particleMesh.setMatrixAt(i,dummy.matrix);
    }
    particleMesh.instanceMatrix.needsUpdate=true;
   }
  }
 };
}
