import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateRoomLayout,calculateOverviewView,LAB_GRID_PITCH,LAB_FOG_FAR} from '../src/scene/room-layout.js';
import {BAYS} from '../src/scene/room.js';

test('room envelope is computed from the real outer machine footprints',()=>{
 const l=calculateRoomLayout(BAYS);
 assert.equal(l.minX,-6.5);
 assert.equal(l.maxX,66);
 assert.equal(l.centerX,29.75);
 assert.equal(l.span,72.5);
 assert.equal(l.wallWidth,l.span+32);
 assert.ok(l.floorSize>=360);
 assert.equal(l.gridSize,l.floorSize);
 assert.equal(l.gridDivisions,l.gridSize/LAB_GRID_PITCH);
 assert.equal(l.gridDivisions%2,0,'preserve an exact central grid axis');
 assert.ok(l.wallMinX<l.minX&&l.wallMaxX>l.maxX);
 assert.ok(l.floorSize/2>LAB_FOG_FAR+35);
});
test('layout expands automatically for a fifth bay without manually editing a wall or grid',()=>{
 const old=calculateRoomLayout(BAYS);
 const next=calculateRoomLayout({...BAYS,extra:{x:155,width:12}});
 assert.equal(next.maxX,161);
 assert.ok(next.wallWidth>old.wallWidth);
 assert.ok(next.floorSize>old.floorSize);
 assert.equal(next.gridDivisions,next.gridSize/2);
 assert.ok(next.minX>=next.centerX-next.floorSize/2);
 assert.ok(next.maxX<=next.centerX+next.floorSize/2);
});
test('layout refuses invalid coordinates instead of building a malformed GPU grid',()=>{
 assert.throws(()=>calculateRoomLayout({}),RangeError);
 assert.throws(()=>calculateRoomLayout({bad:{x:NaN,width:8}}),RangeError);
 assert.throws(()=>calculateRoomLayout({bad:{x:1,width:0}}),RangeError);
});
test('portrait overview contains all five bays while preserving detail field of view',()=>{
 const l=calculateRoomLayout(BAYS);
 const wide=calculateOverviewView(l,1440,900);
 const mobile=calculateOverviewView(l,390,844);
 assert.equal(wide.fov,40);
 assert.ok(wide.distance>=64&&wide.distance<110);
 assert.ok(wide.fogFar>=LAB_FOG_FAR);
 assert.equal(mobile.fov,72);
 assert.ok(mobile.distance>wide.distance);
 assert.ok(mobile.maxDistance>=mobile.distance);
 const aspect=390/844;
 const halfHorizontalFov=Math.atan(Math.tan(mobile.fov*Math.PI/360)*aspect);
 assert.ok(Math.tan(halfHorizontalFov)*mobile.distance>=l.span/2+7.99);
 assert.ok(mobile.fogFar>=mobile.distance*1.4);
});
