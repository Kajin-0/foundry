import * as THREE from 'three';
export function createGeometryHelpers(MAT) {
/* ============ HELPERS ============ */
const cyl = (rt, rb, h, mat, seg = 32, open = false) =>
  new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat);
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const boltGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.055, 6);

// GPU instancing consolidates identical fasteners into one draw call per ring.
function boltRing(radius, count, mat = MAT.steel3, axis = 'x') {
  const bolts = new THREE.InstancedMesh(boltGeo, mat, count);
  const transform = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const angle = i / count * Math.PI * 2;
    transform.position.set(0, 0, 0);
    transform.rotation.set(0, 0, 0);
    if (axis === 'x') {
      transform.rotation.z = Math.PI / 2;
      transform.position.set(0, Math.cos(angle) * radius, Math.sin(angle) * radius);
    } else {
      transform.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    }
    transform.updateMatrix();
    bolts.setMatrixAt(i, transform.matrix);
  }
  bolts.instanceMatrix.needsUpdate = true;
  return bolts;
}

function tubeAlong(points, radius, mat, seg = 32, radial = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius, radial, false), mat);
}

function makeCoil(radius, xStart, xEnd, turns, tubeR, mat) {
  const pts = [];
  const N = Math.round(turns * 12);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(
      xStart + t * (xEnd - xStart),
      Math.cos(a) * radius,
      Math.sin(a) * radius
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, N * 2, tubeR, 5, false), mat);
}

function annularTube(rInner, rOuter, length, mat, seg = 32) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length, bevelEnabled: false, curveSegments: seg
  });
  geo.translate(0, 0, -length / 2);
  geo.rotateY(Math.PI / 2);
  return new THREE.Mesh(geo, mat);
}


return {cyl,box,boltRing,tubeAlong,makeCoil,annularTube};
}
