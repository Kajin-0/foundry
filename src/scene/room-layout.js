/*
 * All room envelope dimensions derive from the actual equipment footprints.
 * Future equipment only needs an additional bay; no manual wall/grid edits.
 * The far edges of the floor/grid remain beyond the 3D fog horizon.
 */
export const LAB_FOG_FAR=110;
export const LAB_GRID_PITCH=2;
export function calculateRoomLayout(bays){
 const entries=Object.entries(bays);
 if(!entries.length)throw new RangeError('At least one equipment bay is required');
 const footprints=entries.map(([key,b])=>{
  const width=b.width??(key==='lpe'?13:8);
  if(!Number.isFinite(b.x)||!Number.isFinite(width)||width<=0)
   throw new RangeError('Invalid equipment bay dimensions: '+key);
  return {key,x:b.x,width,min:b.x-width/2,max:b.x+width/2};
 });
 const minX=Math.min(...footprints.map(x=>x.min));
 const maxX=Math.max(...footprints.map(x=>x.max));
 const centerX=(minX+maxX)/2;
 const span=maxX-minX;
 // The wall has 16 units of breathing room at both ends.
 const wallMinX=minX-16,wallMaxX=maxX+16;
 const wallWidth=wallMaxX-wallMinX;
 // 360 units by default: both edges are safely outside the 110-unit
 // fog horizon, including at the end equipment. As the lab grows, extend
 // automatically but preserve the established 2-unit grid-line pitch.
 const floorSize=Math.ceil(Math.max(360,span+2*LAB_FOG_FAR+40)/LAB_GRID_PITCH)*LAB_GRID_PITCH;
 return Object.freeze({
  minX,maxX,centerX,span,wallMinX,wallMaxX,wallWidth,
  floorSize,gridSize:floorSize,gridDivisions:floorSize/LAB_GRID_PITCH,
  footprint:footprints
 });
}
export function calculateOverviewView(layout,viewportWidth,viewportHeight){
 if(viewportWidth<=0||viewportHeight<=0)throw new RangeError('Invalid viewport');
 const aspect=viewportWidth/viewportHeight;
 // On narrow portrait screens, use a wider overview lens to keep all
 // equipment visible without resorting to an extremely distant orbit.
 const fov=aspect<.85?72:aspect<1.1?56:40;
 const halfHorizontalFov=Math.atan(Math.tan(fov*Math.PI/360)*aspect);
 const distance=Math.max(64,(layout.span/2+8)/Math.tan(halfHorizontalFov));
 const height=Math.max(18.75,distance*.245);
 const fogFar=Math.max(LAB_FOG_FAR,Math.ceil(distance*1.50));
 return Object.freeze({centerX:layout.centerX,targetY:3.25,fov,
  distance,height,fogFar,maxDistance:Math.max(85,distance*1.22)});
}
